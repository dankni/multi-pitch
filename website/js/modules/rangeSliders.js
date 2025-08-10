/**
 RANGE SLIDERS
 **/
export function attachInputRangeListeners(containers) {
    function changeListener(event) {
        var parent = this.parentNode;
        var inputs = parent.getElementsByTagName('input');
        var values = [];
        for(var i = 0; i < inputs.length; i++) {
            values[i] = +inputs[i].value;
        }
        parent.value = values[0] < values[1] ? values : [values[1], values[0]];
        var event = document.createEvent('Event');
        event.initEvent('change', true, true);
        parent.dispatchEvent(event);
    }
    function mousemoveListener(event) {
        let x = (event.clientX - this.offsetLeft) / this.offsetWidth;
        let inputs = this.getElementsByTagName('input');
        let min_dist = Infinity;
        let min_index = 0;
        for(let i = 0; i < inputs.length; i++) {
            let dist = (inputs[i].value - inputs[i].min) / (inputs[i].max - inputs[i].min);
            dist = Math.abs(dist - x);
            if (dist < min_dist) {
                min_dist = dist;
                min_index = i;
            }
        }
        for(let i = 0; i < inputs.length; i++) {
            inputs[i].style.zIndex = i == min_index ? 1 : 0;
        }
    }
    var containers = containers || document.getElementsByClassName('input-range');
    for(var i = 0; i < containers.length; i++) {
    	// Move the closest input range to the top.
        containers[i].addEventListener('mousemove', mousemoveListener);
        // Generate an onchange event for the input range container.
        var inputs = containers[i].getElementsByTagName('input');
        for (var j = 0; j < inputs.length; j++) {
            inputs[j].addEventListener('input', changeListener);
            inputs[j].addEventListener('change', changeListener);
        }
    }
}
window.attachInputRangeListeners = attachInputRangeListeners;