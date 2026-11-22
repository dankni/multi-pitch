#include <Arduino.h>
/*
  Bluetooth Clicker for the multi-pitch.com training apps
  ESP32-C3 SuperMini + 0.96" SSD1306 OLED + KY-040 rotary encoder (dial)

  Switched on under the cog in Gym Session, Outside, Tick List (Gilford) or
  Dans Loft as "Bluetooth clicker" (website/training/common/clicker.js).
  It works like the Bangle watch's Climb Log app, without heart rate or height:

    ladder mode (gym, outside, Dans Loft): turn = move up/down the grades or routes,
                press = tick it. Turning past the top asks the phone for a harder grade.
    panel mode  (Gilford): turn = move through the routes, panel by panel,
                press = tick it, or take the tick back.
    Long press  = menu: Back / Undo last / <other ladder> / Finish session / Power off
    Press while off = wake

  Wiring:
    OLED   GND->G   VDD->3.3   SCK->GPIO6   SDA->GPIO5
    Dial   GND->G   +->3.3     CLK->GPIO3   DT->GPIO4   SW->GPIO1

  Protocol (BLE Nordic UART Service, one line of JSON each way, ending \n):
    Phone -> clicker:
      {"t":"hi","id":<session>,"ev":<n>}      after connecting: send anything not yet had, then hello
      {"t":"state","m":"ladder","s":"running","id":..,"ev":..,"l":"boulder",
         "L":[{"k":"boulder","n":"Bouldering","r":[["V3","V3",2],...]}]}
      {"t":"state","m":"panel","s":"running","id":..,"ev":..,"n":5,"of":24,
         "P":[[[1,"4 Yellow",0],[2,"5+ Orange",1],...],...]}
    Clicker -> phone (each numbered q from 0 per session, kept till the phone's ev passes it):
      {"t":"add","g":KEY,"q":0}  {"t":"undo","g":KEY,"q":1}  {"t":"tab","l":"sport","q":2}
      {"t":"harder","l":"boulder","q":3}  {"t":"tick","r":7,"on":1,"q":4}  {"t":"finish","q":5}
      {"t":"hello"}
*/

#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "esp_sleep.h"
#include "driver/gpio.h"

// ---------- Pins ----------
#define PIN_SDA   5
#define PIN_SCL   6
#define PIN_CLK   3
#define PIN_DT    4
#define PIN_SW    1     // must be GPIO 0-5 so it can wake the chip from sleep

// ---------- Settings ----------
#define DEVICE_NAME      "Clicker"    // the app looks for a name starting with this
#define DIAL_REVERSE     0            // set to 1 if turning right moves backwards
#define DIAL_HALF_STEP   0            // set to 1 if it takes two clicks to move one step
#define LONG_PRESS_MS    700          // hold this long to open the menu
#define AUTO_OFF_MIN     10           // minutes without use before sleeping (0 = never)
#define MENU_TIMEOUT_MS  10000        // menu closes itself after this long

#define NUS_SERVICE "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_RX      "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_TX      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

Adafruit_SSD1306 oled(128, 64, &Wire, -1);
NimBLEServer* server = nullptr;
NimBLECharacteristic* txChar = nullptr;

// =====================================================================
//  Kept through deep sleep (RTC memory) - lost only if the power goes
// =====================================================================

#define STATE_MAX  2560
#define SENT_MAX   32
#define SENT_LEN   48
#define MINE_MAX   32
#define KEY_LEN    20
#define LADDER_MAX 8

RTC_DATA_ATTR char     rtcState[STATE_MAX];        // the phone's last state, as JSON
RTC_DATA_ATTR uint16_t rtcStateLen = 0;
RTC_DATA_ATTR char     sentId[32] = "";            // the session the sent list is for
RTC_DATA_ATTR uint32_t sentN = 0;                  // the next one's number
RTC_DATA_ATTR uint8_t  sentCount = 0;
RTC_DATA_ATTR uint32_t sentQ[SENT_MAX];
RTC_DATA_ATTR char     sentLine[SENT_MAX][SENT_LEN];
RTC_DATA_ATTR uint8_t  mineCount = 0;              // ticked here, latest last, for undo
RTC_DATA_ATTR uint8_t  mineLadder[MINE_MAX];
RTC_DATA_ATTR char     mineKey[MINE_MAX][KEY_LEN];
RTC_DATA_ATTR int16_t  pick[LADDER_MAX];           // the row on show, by ladder
RTC_DATA_ATTR int16_t  pickPanel = 0;              // the route on show, counted across all panels

// ---------- The phone's state ----------
JsonDocument doc;
bool haveState = false;
char stateId[32] = "";

// ---------- Shared with BLE callbacks ----------
volatile bool connected = false;
volatile bool dirty     = true;
volatile uint16_t connHandle = 0;
SemaphoreHandle_t rxLock;
std::string rxPending;      // written by the BLE task, read in loop()
bool linked = false;        // the app has said hi, not just anything connected

// ---------- UI state ----------
enum Screen { MAIN, MENU, CONFIRM_FINISH };
Screen screen = MAIN;

enum Item { I_BACK, I_UNDO, I_LADDER, I_FINISH, I_POWER };
Item menuItems[5];
int  menuCount = 0;
int  menuPos   = 0;
int  confirmPos = 0;         // 0 = No, 1 = Yes
char toast[22]  = "";
uint32_t toastUntil = 0;
uint32_t lastInput  = 0;

// =====================================================================
//  Dial (rotary encoder) - read with interrupts so no clicks are missed
// =====================================================================

portMUX_TYPE encMux = portMUX_INITIALIZER_UNLOCKED;
volatile int32_t encSteps = 0;
volatile int8_t  encAcc   = 0;
volatile uint8_t encState = 3;

// Valid quadrature transitions: +1 one way, -1 the other, 0 = bounce/invalid
const int8_t ENC_TABLE[16] = { 0,-1, 1, 0,  1, 0, 0,-1,  -1, 0, 0, 1,  0, 1,-1, 0 };

void IRAM_ATTR encISR() {
  uint8_t s = (digitalRead(PIN_CLK) << 1) | digitalRead(PIN_DT);
  portENTER_CRITICAL_ISR(&encMux);
  encAcc += ENC_TABLE[(encState << 2) | s];
  encState = s;
  bool rest = (s == 3) || (DIAL_HALF_STEP && s == 0);   // dial sitting in a click
  if (rest) {
    if (encAcc >= 2)       encSteps = encSteps + 1;
    else if (encAcc <= -2) encSteps = encSteps - 1;
    encAcc = 0;
  }
  portEXIT_CRITICAL_ISR(&encMux);
}

// =====================================================================
//  Helpers
// =====================================================================

void showToast(const char* msg) {
  strncpy(toast, msg, sizeof(toast) - 1);
  toast[sizeof(toast) - 1] = 0;
  toastUntil = millis() + 1200;
  dirty = true;
}

// A JSON value as text, e.g. 7 or "V3", to compare and keep
void keyText(JsonVariantConst v, char* out, size_t size) {
  out[0] = 0;
  if (!v.isNull()) serializeJson(v, out, size);
}

// Keeps the state through deep sleep, if it fits
void keepState() {
  size_t len = measureJson(doc);
  if (len < STATE_MAX) {
    serializeJson(doc, rtcState, STATE_MAX);
    rtcStateLen = len;
  } else {
    rtcStateLen = 0;
  }
}

// =====================================================================
//  Talking to the phone
// =====================================================================

// A line to the phone, in pieces as big as the link allows
void tell(const char* line) {
  if (!connected || !txChar) return;
  size_t len = strlen(line);
  size_t piece = 20;
  uint16_t mtu = server->getPeerMTU(connHandle);
  if (mtu > 23) piece = min((size_t)(mtu - 3), (size_t)180);
  std::string all = std::string(line) + "\n";
  for (size_t at = 0; at < all.size(); at += piece) {
    size_t n = min(piece, all.size() - at);
    txChar->setValue((const uint8_t*)all.data() + at, n);
    txChar->notify();
    delay(4);
  }
}

// Numbered and kept till the phone says it has it; sent now if linked
bool send(JsonDocument& msg) {
  if (strcmp(sentId, stateId) != 0) {
    strncpy(sentId, stateId, sizeof(sentId) - 1);
    sentCount = 0;
    sentN = 0;
  }
  if (sentCount >= SENT_MAX) { showToast("Phone needed"); return false; }
  msg["q"] = sentN;
  char line[SENT_LEN];
  size_t len = serializeJson(msg, line, sizeof(line));
  if (len == 0 || len >= sizeof(line) - 1) { showToast("Too long"); return false; }
  sentQ[sentCount] = sentN;
  strcpy(sentLine[sentCount], line);
  sentCount++;
  sentN++;
  if (linked) tell(line);
  return true;
}

// The phone has everything before ev
bool had(JsonDocument& ask) {
  char id[32];
  keyText(ask["id"], id, sizeof(id));
  if (strcmp(id, sentId) != 0 || !ask["ev"].is<uint32_t>()) return false;
  uint32_t ev = ask["ev"];
  uint8_t keep = 0;
  for (uint8_t i = 0; i < sentCount; i++) {
    if (sentQ[i] >= ev) {
      if (keep != i) { sentQ[keep] = sentQ[i]; strcpy(sentLine[keep], sentLine[i]); }
      keep++;
    }
  }
  sentCount = keep;
  return true;
}

void onHi(JsonDocument& msg) {
  linked = true;
  if (had(msg)) {
    for (uint8_t i = 0; i < sentCount; i++) tell(sentLine[i]);
  }
  tell("{\"t\":\"hello\"}");
  dirty = true;
}

void onState(JsonDocument& msg) {
  char id[32];
  keyText(msg["id"], id, sizeof(id));
  const char* s = msg["s"] | "idle";
  // a new session, or none, starts clean: nothing to undo, from the first grade and route
  if (!haveState || strcmp(id, stateId) != 0 || strcmp(s, "idle") == 0) {
    mineCount = 0;
    for (int i = 0; i < LADDER_MAX; i++) pick[i] = 0;
    pickPanel = 0;
  }
  had(msg);
  doc = msg;
  strcpy(stateId, id);
  haveState = true;
  keepState();
  // a finished session closes the menu
  if (strcmp(s, "running") != 0 && screen == CONFIRM_FINISH) screen = MAIN;
  dirty = true;
}

void handleLine(const std::string& line) {
  JsonDocument msg;
  if (deserializeJson(msg, line)) return;
  const char* t = msg["t"] | "";
  if (strcmp(t, "hi") == 0) onHi(msg);
  else if (strcmp(t, "state") == 0) onState(msg);
}

// Whole lines from what the BLE task has put by
void pollRx() {
  std::string got;
  xSemaphoreTake(rxLock, portMAX_DELAY);
  got.swap(rxPending);
  xSemaphoreGive(rxLock);
  if (got.empty()) return;
  static std::string heard;
  heard += got;
  size_t nl;
  while ((nl = heard.find('\n')) != std::string::npos) {
    std::string line = heard.substr(0, nl);
    heard.erase(0, nl + 1);
    handleLine(line);
  }
  if (heard.size() > 8192) heard.clear();   // a line that never ended
}

// =====================================================================
//  BLE callbacks
// =====================================================================

class ServerCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s, NimBLEConnInfo& info) override {
    connHandle = info.getConnHandle();
    connected = true;
    dirty = true;
  }
  void onDisconnect(NimBLEServer* s, NimBLEConnInfo& info, int reason) override {
    connected = false;
    dirty = true;
    NimBLEDevice::startAdvertising();
  }
};

class RxCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    std::string v = c->getValue();
    xSemaphoreTake(rxLock, portMAX_DELAY);
    rxPending += v;
    xSemaphoreGive(rxLock);
  }
};

// =====================================================================
//  The state: ladders and panels
// =====================================================================

const char* mode()  { return doc["m"] | "ladder"; }
const char* stage() { return doc["s"] | "idle"; }

bool onMain() {
  if (!haveState) return false;
  const char* s = stage();
  return strcmp(s, "running") == 0 || (strcmp(s, "paused") == 0 && strcmp(mode(), "ladder") != 0);
}

bool isLadder() { return onMain() && strcmp(mode(), "ladder") == 0 && doc["L"].size() > 0; }
bool isPanel()  { return onMain() && strcmp(mode(), "panel") == 0 && doc["P"].size() > 0; }

int ladderIndex() {
  JsonArray L = doc["L"];
  const char* l = doc["l"] | "";
  for (size_t i = 0; i < L.size(); i++) {
    if (strcmp(L[i]["k"] | "", l) == 0) return min((int)i, LADDER_MAX - 1);
  }
  return 0;
}

JsonObject ladder() { return doc["L"][ladderIndex()]; }

int ladderTotal(JsonObject lad) {
  int sum = 0;
  for (JsonArray row : lad["r"].as<JsonArray>()) sum += row[2].as<int>();
  return sum;
}

// past the top while a harder grade is on its way from the phone
int rowAt() {
  int rows = ladder()["r"].size();
  return max(0, min((int)pick[ladderIndex()], rows - 1));
}

int otherLadderIndex() {
  return (ladderIndex() + 1) % doc["L"].size();
}

int routeCount() {
  int n = 0;
  for (JsonArray panel : doc["P"].as<JsonArray>()) n += panel.size();
  return n;
}

// the route at a place counted across all the panels
JsonArray routeAt(int at, int* panelOut = nullptr, int* indexOut = nullptr) {
  int p = 0;
  for (JsonArray panel : doc["P"].as<JsonArray>()) {
    if (at < (int)panel.size()) {
      if (panelOut) *panelOut = p;
      if (indexOut) *indexOut = at;
      return panel[at];
    }
    at -= panel.size();
    p++;
  }
  return JsonArray();
}

// =====================================================================
//  Drawing
// =====================================================================

void drawHeader(const char* left) {
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(0, 0);
  oled.print(millis() < toastUntil ? toast : left);
  // the link: filled once the app has said hi, a ring while only connected
  if (linked && connected)  oled.fillCircle(123, 3, 3, SSD1306_WHITE);
  else if (connected)       oled.drawCircle(123, 3, 3, SSD1306_WHITE);
  else { oled.drawLine(120, 0, 126, 6, SSD1306_WHITE); oled.drawLine(126, 0, 120, 6, SSD1306_WHITE); }
}

void centred(const char* text, int y, int size) {
  oled.setTextSize(size);
  int w = strlen(text) * 6 * size;
  oled.setCursor(max(0, (128 - w) / 2), y);
  oled.print(text);
}

void drawMessage(const char* a, const char* b, const char* c) {
  oled.setTextColor(SSD1306_WHITE);
  if (c) { centred(a, 18, 1); centred(b, 30, 1); centred(c, 42, 1); }
  else if (b) { centred(a, 22, 1); centred(b, 36, 1); }
  else centred(a, 28, 2);
}

// one row of a ladder as a line of small text, its count on the right
void drawSmallRow(JsonArray row, int y) {
  char label[19];
  strncpy(label, row[1] | "", sizeof(label) - 1);
  label[sizeof(label) - 1] = 0;
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(4, y);
  oled.print(label);
  int count = row[2] | 0;
  if (count > 0) {
    char c[6];
    snprintf(c, sizeof(c), "x%d", count);
    oled.setCursor(126 - strlen(c) * 6, y);
    oled.print(c);
  }
}

// "V2 Sky Blue": the grade large, the rest under it
void drawBigRow(JsonArray row, int top) {
  oled.fillRect(0, top, 128, 26, SSD1306_WHITE);
  oled.setTextColor(SSD1306_BLACK);
  const char* label = row[1] | "";
  const char* space = strchr(label, ' ');
  char grade[11];
  size_t glen = space ? min((size_t)(space - label), sizeof(grade) - 1) : min(strlen(label), sizeof(grade) - 1);
  memcpy(grade, label, glen);
  grade[glen] = 0;
  oled.setTextSize(2);
  oled.setCursor(4, space ? top + 2 : top + 5);
  oled.print(grade);
  int count = row[2] | 0;
  if (count > 0) {
    char c[6];
    snprintf(c, sizeof(c), "x%d", count);
    oled.setCursor(124 - strlen(c) * 12, space ? top + 2 : top + 5);
    oled.print(c);
  }
  if (space) {
    char rest[22];
    strncpy(rest, space + 1, sizeof(rest) - 1);
    rest[sizeof(rest) - 1] = 0;
    oled.setTextSize(1);
    oled.setCursor(4, top + 18);
    oled.print(rest);
  }
}

void drawLadder() {
  JsonObject lad = ladder();
  JsonArray rows = lad["r"];
  int i = rowAt();
  char head[22];
  snprintf(head, sizeof(head), "%.14s %d", lad["n"] | "", ladderTotal(lad));
  drawHeader(head);
  if (i > 0) drawSmallRow(rows[i - 1], 12);
  drawBigRow(rows[i], 22);
  if (i + 1 < (int)rows.size()) drawSmallRow(rows[i + 1], 52);
}

void drawTick(int x, int y, uint16_t colour) {
  oled.drawLine(x, y + 4, x + 3, y + 7, colour);
  oled.drawLine(x + 3, y + 7, x + 9, y + 1, colour);
  oled.drawLine(x, y + 5, x + 3, y + 8, colour);
  oled.drawLine(x + 3, y + 8, x + 9, y + 2, colour);
}

void drawPanel() {
  int total = routeCount();
  pickPanel = max(0, min((int)pickPanel, total - 1));
  int panel = 0, index = 0;
  routeAt(pickPanel, &panel, &index);
  char head[22];
  snprintf(head, sizeof(head), "Panel %d  %d/%d", panel + 1, doc["n"] | 0, doc["of"] | total);
  drawHeader(head);
  JsonArray routes = doc["P"][panel];
  for (size_t n = 0; n < routes.size() && n < 3; n++) {
    JsonArray route = routes[n];
    int y = 12 + n * 17;
    bool sel = (int)n == index;
    uint16_t fg = sel ? SSD1306_BLACK : SSD1306_WHITE;
    if (sel) oled.fillRect(0, y, 128, 16, SSD1306_WHITE);
    if (route[2].as<int>()) drawTick(3, y + 3, fg);
    const char* label = route[1] | "";
    const char* space = strchr(label, ' ');
    char grade[6];
    size_t glen = space ? min((size_t)(space - label), sizeof(grade) - 1) : min(strlen(label), sizeof(grade) - 1);
    memcpy(grade, label, glen);
    grade[glen] = 0;
    oled.setTextColor(fg);
    oled.setTextSize(2);
    oled.setCursor(18, y + 1);
    oled.print(grade);
    if (space) {
      oled.setTextSize(1);
      oled.setCursor(18 + glen * 12 + 4, y + 5);
      char rest[14];
      strncpy(rest, space + 1, sizeof(rest) - 1);
      rest[sizeof(rest) - 1] = 0;
      oled.print(rest);
    }
  }
}

void drawMain() {
  if (!haveState) {
    drawHeader("Clicker");
    drawMessage(connected ? "Connected" : "Not connected", nullptr, nullptr);
    return;
  }
  const char* s = stage();
  if (!onMain()) {
    drawHeader("Clicker");
    if (strcmp(s, "saving") == 0 || strcmp(s, "finished") == 0) drawMessage("Finished.", "Save it on", "your phone");
    else if (strcmp(s, "counting") == 0) drawMessage("Ready", nullptr, nullptr);
    else drawMessage("Start a session", "on your phone", nullptr);
  } else if (isLadder()) {
    drawLadder();
  } else if (isPanel()) {
    drawPanel();
  } else {
    drawHeader("Clicker");
    drawMessage("Use your phone", nullptr, nullptr);
  }
}

const char* itemName(Item item) {
  switch (item) {
    case I_BACK:   return "Back";
    case I_UNDO:   return "Undo last";
    case I_LADDER: return doc["L"][otherLadderIndex()]["n"] | "Other ladder";
    case I_FINISH: return "Finish session";
    case I_POWER:  return "Power off";
  }
  return "";
}

void drawMenu() {
  drawHeader("Menu");
  int rowH = menuCount > 4 ? 10 : 12;
  for (int i = 0; i < menuCount; i++) {
    int y = 12 + i * rowH;
    bool sel = (i == menuPos);
    if (sel) oled.fillRect(0, y, 128, rowH, SSD1306_WHITE);
    oled.setTextSize(1);
    oled.setTextColor(sel ? SSD1306_BLACK : SSD1306_WHITE);
    oled.setCursor(6, y + (rowH - 8) / 2);
    char name[21];
    strncpy(name, itemName(menuItems[i]), sizeof(name) - 1);
    name[sizeof(name) - 1] = 0;
    oled.print(name);
  }
}

void drawConfirm() {
  drawHeader("Finish the session?");
  const char* opts[2] = { "No", "Yes" };
  for (int i = 0; i < 2; i++) {
    int x = 14 + i * 58;
    bool sel = (i == confirmPos);
    if (sel) oled.fillRect(x, 30, 42, 16, SSD1306_WHITE);
    else     oled.drawRect(x, 30, 42, 16, SSD1306_WHITE);
    oled.setTextSize(1);
    oled.setTextColor(sel ? SSD1306_BLACK : SSD1306_WHITE);
    oled.setCursor(x + 21 - strlen(opts[i]) * 3, 34);
    oled.print(opts[i]);
  }
}

void draw() {
  oled.clearDisplay();
  if (screen == MAIN)      drawMain();
  else if (screen == MENU) drawMenu();
  else                     drawConfirm();
  oled.display();
}

// =====================================================================
//  Power off (deep sleep) - a dial press wakes it
// =====================================================================

void powerOff() {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  centred("Bye", 24, 2);
  oled.display();
  delay(700);
  oled.ssd1306_command(SSD1306_DISPLAYOFF);

  // Wait for the dial to be released, or the same press would wake it again
  while (digitalRead(PIN_SW) == LOW) delay(10);
  delay(50);

  gpio_pullup_en((gpio_num_t)PIN_SW);
  gpio_pulldown_dis((gpio_num_t)PIN_SW);
  esp_deep_sleep_enable_gpio_wakeup(1ULL << PIN_SW, ESP_GPIO_WAKEUP_GPIO_LOW);
  esp_deep_sleep_start();
}

// =====================================================================
//  Actions, as the watch's
// =====================================================================

void tickLadderRow() {
  JsonObject lad = ladder();
  JsonArray row = lad["r"][rowAt()];
  JsonDocument msg;
  msg["t"] = "add";
  msg["g"] = row[0];
  if (!send(msg)) return;
  row[2] = row[2].as<int>() + 1;
  if (mineCount >= MINE_MAX) {   // forget the oldest
    memmove(mineLadder, mineLadder + 1, MINE_MAX - 1);
    memmove(mineKey, mineKey + 1, (MINE_MAX - 1) * KEY_LEN);
    mineCount--;
  }
  mineLadder[mineCount] = ladderIndex();
  keyText(row[0], mineKey[mineCount], KEY_LEN);
  mineCount++;
  keepState();
  char t[22];
  snprintf(t, sizeof(t), "+1 %.18s", row[1] | "");
  showToast(t);
}

void undoLast() {
  if (mineCount == 0) { showToast("Nothing to undo"); return; }
  mineCount--;
  JsonArray rows = doc["L"][mineLadder[mineCount]]["r"];
  for (JsonArray row : rows) {
    char k[KEY_LEN];
    keyText(row[0], k, sizeof(k));
    if (strcmp(k, mineKey[mineCount]) == 0 && row[2].as<int>() > 0) {
      JsonDocument msg;
      msg["t"] = "undo";
      msg["g"] = row[0];
      if (send(msg)) {
        row[2] = row[2].as<int>() - 1;
        keepState();
        showToast("Undone");
      }
      return;
    }
  }
}

void switchLadder() {
  JsonObject other = doc["L"][otherLadderIndex()];
  JsonDocument msg;
  msg["t"] = "tab";
  msg["l"] = other["k"];
  if (!send(msg)) return;
  doc["l"] = other["k"].as<const char*>();
  keepState();
}

void moveLadder(int dir) {
  int li = ladderIndex();
  int rows = ladder()["r"].size();
  int i = rowAt() + dir;
  if (i < 0) return;
  if (i >= rows) {
    // up past the top asks the phone for a harder grade, once
    if (pick[li] < rows) {
      JsonDocument msg;
      msg["t"] = "harder";
      msg["l"] = ladder()["k"];
      send(msg);
    }
    pick[li] = rows;
    return;
  }
  pick[li] = i;
}

void tickRoute() {
  JsonArray route = routeAt(pickPanel);
  if (route.isNull()) return;
  int on = route[2].as<int>() ? 0 : 1;
  JsonDocument msg;
  msg["t"] = "tick";
  msg["r"] = route[0];
  msg["on"] = on;
  if (!send(msg)) return;
  route[2] = on;
  doc["n"] = (doc["n"] | 0) + (on ? 1 : -1);
  keepState();
  char t[22];
  snprintf(t, sizeof(t), "%s %.15s", on ? "Ticked" : "Untick", route[1] | "");
  showToast(t);
}

void finishSession() {
  JsonDocument msg;
  msg["t"] = "finish";
  if (!send(msg)) return;
  doc["s"] = "saving";
  mineCount = 0;
  keepState();
}

void openMenu() {
  menuCount = 0;
  menuItems[menuCount++] = I_BACK;
  if (isLadder()) {
    if (mineCount > 0) menuItems[menuCount++] = I_UNDO;
    if (doc["L"].size() > 1) menuItems[menuCount++] = I_LADDER;
  }
  if (onMain() && strcmp(stage(), "running") == 0) menuItems[menuCount++] = I_FINISH;
  menuItems[menuCount++] = I_POWER;
  menuPos = 0;
  screen = MENU;
}

// =====================================================================
//  Input
// =====================================================================

void onStep(int dir) {
  if (screen == MAIN) {
    if (isLadder()) moveLadder(dir);
    else if (isPanel()) pickPanel = max(0, min((int)pickPanel + dir, routeCount() - 1));
  } else if (screen == MENU) {
    menuPos = (menuPos + dir + menuCount) % menuCount;
  } else {
    confirmPos = 1 - confirmPos;
  }
}

void onShortPress() {
  if (screen == MAIN) {
    if (isLadder()) tickLadderRow();
    else if (isPanel()) tickRoute();
  } else if (screen == MENU) {
    Item item = menuItems[menuPos];
    screen = MAIN;
    switch (item) {
      case I_BACK:   break;
      case I_UNDO:   undoLast(); break;
      case I_LADDER: switchLadder(); break;
      case I_FINISH: screen = CONFIRM_FINISH; confirmPos = 0; break;
      case I_POWER:  powerOff(); break;
    }
  } else {
    if (confirmPos == 1) finishSession();
    screen = MAIN;
  }
}

void onLongPress() {
  if (screen == MAIN) openMenu();
  else                screen = MAIN;
}

// Dial button: short press vs long press, with debounce
bool     btnDown     = false;   // debounced physical state
uint32_t btnChangeAt = 0;
uint32_t pressStart  = 0;
bool     pressActive = false;   // a press we are tracking
bool     longFired   = false;
bool     btnArmed    = false;   // ignores the press that woke the board

void pollButton() {
  bool raw = (digitalRead(PIN_SW) == LOW);
  if (raw != btnDown && millis() - btnChangeAt > 25) {
    btnDown = raw;
    btnChangeAt = millis();
    if (btnDown) {
      if (btnArmed) { pressActive = true; pressStart = millis(); longFired = false; }
    } else {
      if (pressActive && !longFired) onShortPress();
      pressActive = false;
      btnArmed = true;
    }
    lastInput = millis();
    dirty = true;
  }
  if (pressActive && !longFired && millis() - pressStart >= LONG_PRESS_MS) {
    longFired = true;
    onLongPress();
    dirty = true;
  }
}

// =====================================================================
//  Setup / loop
// =====================================================================

void setup() {
  Serial.begin(115200);
  rxLock = xSemaphoreCreateMutex();

  pinMode(PIN_CLK, INPUT_PULLUP);
  pinMode(PIN_DT,  INPUT_PULLUP);
  pinMode(PIN_SW,  INPUT_PULLUP);

  btnDown  = (digitalRead(PIN_SW) == LOW);
  btnArmed = !btnDown;            // if woken by a press, wait for its release

  encState = (digitalRead(PIN_CLK) << 1) | digitalRead(PIN_DT);
  attachInterrupt(digitalPinToInterrupt(PIN_CLK), encISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_DT),  encISR, CHANGE);

  Wire.begin(PIN_SDA, PIN_SCL);
  if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found (check wiring / address 0x3C)");
  }

  // the state from before sleeping, so it can tick before the phone is back
  if (rtcStateLen > 0 && !deserializeJson(doc, rtcState, rtcStateLen)) {
    haveState = true;
    keyText(doc["id"], stateId, sizeof(stateId));
  }

  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setMTU(247);
  server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCB());

  NimBLEService* svc = server->createService(NUS_SERVICE);
  txChar = svc->createCharacteristic(NUS_TX, NIMBLE_PROPERTY::NOTIFY);
  NimBLECharacteristic* rx = svc->createCharacteristic(
      NUS_RX, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  rx->setCallbacks(new RxCB());
  server->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->setName(DEVICE_NAME);
  adv->addServiceUUID(NUS_SERVICE);
  adv->enableScanResponse(true);
  adv->start();

  lastInput = millis();
  draw();
}

void loop() {
  static bool wasConnected = false;
  if (wasConnected && !connected) { linked = false; dirty = true; }
  wasConnected = connected;

  pollRx();

  // Dial turns
  int32_t steps;
  portENTER_CRITICAL(&encMux);
  steps = encSteps;
  encSteps = 0;
  portEXIT_CRITICAL(&encMux);
  if (DIAL_REVERSE) steps = -steps;

  // Ignore turns while pressing (and just after), so a press can't nudge the choice
  bool ignoreTurns = btnDown || (millis() - btnChangeAt < 150);
  if (steps != 0 && !ignoreTurns) {
    int dir = steps > 0 ? 1 : -1;
    for (int i = 0; i < abs(steps); i++) onStep(dir);
    lastInput = millis();
    dirty = true;
  }

  pollButton();

  // Menu closes itself if left alone
  if (screen != MAIN && millis() - lastInput > MENU_TIMEOUT_MS) {
    screen = MAIN;
    dirty = true;
  }

  // Auto power-off
  if (AUTO_OFF_MIN > 0 && millis() - lastInput > (uint32_t)AUTO_OFF_MIN * 60000UL) {
    powerOff();
  }

  // Redraw now and then, to clear messages
  static uint32_t lastTick = 0;
  if (millis() - lastTick >= 500) { lastTick = millis(); dirty = true; }

  if (dirty) { dirty = false; draw(); }
  delay(2);
}
