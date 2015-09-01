/**
 * The plugin for drag and drop files to web application
 *
 * @author Lukasz Sudol
 */

 $(document).ready(function() {
	 
(function (window, undefined) {

    /**
     * Text area
     * @type {HTMLElement}
     */
    var dropZone = document.getElementById('dropZone');
	var APWPZone = document.getElementById('APWPZone');
    var append = document.getElementById('append');

    /**
     * Set event listeners
     */
    dropZone.addEventListener('dragover', dragOver);
    dropZone.addEventListener('dragend', dragEnd);
    dropZone.addEventListener('drop', readText, false);
	   
	APWPZone.addEventListener('dragover', dragOver);
    APWPZone.addEventListener('dragend', dragEnd);
    APWPZone.addEventListener('drop', readText, false);

    /**
     *
     * @param e
     * @returns {boolean}
     */
    function dragOver(e) {
        e.stopPropagation(); // for some browsers stop redirecting
        e.preventDefault();
        return false;
    }

    function dragEnd(e) {
        e.stopPropagation(); // for some browsers stop redirecting
        e.preventDefault();
        return false;
    }

    function readText(e) {
		console.log(e.target.id);
        e.stopPropagation(); // for some browsers stop redirecting
        e.preventDefault();

        var file,
            fileData,
            fileReader,
            files = e.dataTransfer.files;

        if (!files) {
            return;
        }

        //not append
        if(append.checked == false)
            e.target.id.value = '';

        for(var i=0;i<files.length;i++)
        {
            file = files[i];

            //new instance for each file
            fileReader = new FileReader();
            fileReader.textArea = eval(e.target.id);

            fileData = function (event) {
                this.textArea.value += this.result
            };

            fileReader.addEventListener('loadend',fileData);
            fileReader.readAsText(file);
        }
    }

})(window);

 });