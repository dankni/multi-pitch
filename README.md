# multi-pitch
*A site dedicated to traditional multi-pitch rock climbing https://www.multi-pitch.com* 

## The Site & It’s Values
The site aims to be a useful resource for Traditional climbers focused on multi-pitch and adventure / mountain climbing. [The about page](https://www.multi-pitch.com/about/) has a full explanation of what the site is all about, but broadly speaking we want to:
* Inspire climbers though great visual imagery
* Promote the traditional ethic by making it more accessible
* Provide a free and useful resource for the community of climbers

## Site Status
When the site reaches 100 climbs it will be of comparable size to dedicated guidebooks. This point I will consider the first phase (v1.0.0) to be completed and will start the work of promoting the site on forums and through other means. For now, it’s essentially in beta. 

## Content Rules
### Descriptions
* Avoid I or We, instead use “the climber”
* Avoid complex mountain terminology, or at least qualify it. Eg, avoid “Follow the col until you see the dihedral before the arete on the left” Instead use “Follow the Gully between the rocks until you see the corner before the exposed edge on the left”.
* Informal language is fine
* Interesting facts are important including geology, first or notable ascent and history
* Referance links should be start with a relevant prefix for usability. Options include
`Video`, `Travel`, `Article`, `Info`, `Tides` for example: [`Video: Chris Bonington Climbs the Old man of Hoy`](https://www.youtube.com/watch?v=_aIrZnJkIqs)


### Images
* Tile images should be an inspirational photo of the crag with the climb ideally in full in shot. 
* Stylistically tile images should have blue sky as the highest point in the image and crag in the centre. 
* Technically tile images should be 600px x 300px (for retina devices) and around 100Kb in size as a .jpg
* Crag / Topo images should be functional and very detailed.
*There need to be between 2 and 5 images images created for dynamic topos, these should work as follows:

| number | What’s in the image | Size | Naming |
|-------|------------------|----|-----|
|1| The raw image of the crag | As big as possible to a max of 4,000px wide. | Ideally crag.jpg |
|2|	As above but with topo drawn on | As above | Something SEO friendly eg. `<<Climb-name>>-route-on-<<cliff-name>>-multi-pitch.jpg` |
|3|	Same as img 2 |	Width of exactly 1080px	| Identical to 2 but with `-small` appended just before `.jpg`.|
|4|	Same as img 2 |	Width of exactly 1600px	| Identical to 2 but with `-medium` appended just before `.jpg`.|
|5|	Same as img 2 |	Width of exactly 2160px	| Identical to 2 but with `-large` appended just before `.jpg`.|


Depending on the number possible based on the original image size, the value in the datafile needs to be between 2 and 5. So for example if the original image is only 800px wide the value in the spreadsheet for datafile is 2. If the original is over 2160 then all 5 images can be created and the data value is 5. This is to enable the best media queries. The media queries are quite complicated and take into account device width and pixel density of the device screen in order to provide a decent image for the user without wasting bandwidth. WebP format is also used if the device supports it to make the images smaller without reduced quality. 

### WebP Conversion 
WebP conversion uses [this node package](https://www.npmjs.com/package/webp-converter-cli). It can be run using the command `webpc -r` from command line in the relavant folder where ` -r` makes it recursively convert all sub folder images. 

### JSON updating
The site is built from JSON data files that, once loaded are saved in local storage for very fast page load times and less network traffic (and more offline capabilities in the future). This comes at the cost of a lot  development complexity. I have built an slighlty unwieldy beast, in order to 
optimise the user experiance. This is how the logic should work:
![Local storage data flow](https://www.multi-pitch.com/img/other/flow.png)
