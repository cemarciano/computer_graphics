//
// Global variables
//
var scene, width, height, camera, renderer;
var mouseIsPressed, mouseX, mouseY, pmouseX, pmouseY;

//
// Initialization of global objects and set up callbacks for mouse and resize
//
function init() {

	// Scene object
	scene = new THREE.Scene();

	// Will use the whole window for the webgl canvas
	width = window.innerWidth -20;
	height = window.innerHeight -20;

	// Orthogonal camera for 2D drawing
	camera = new THREE.OrthographicCamera( 0, width, 0, height, -height, height );
	camera.lookAt (new THREE.Vector3 (0,0,0));

	// Renderer will use a canvas taking the whole window
	renderer = new THREE.WebGLRenderer( {antialias: true});
	renderer.sortObjects = false;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( width, height );

	// Append camera to the page
	document.body.appendChild( renderer.domElement );

	// Set resize (reshape) callback
	window.addEventListener( 'resize', resize );

	// Set up mouse callbacks. 
	// Call mousePressed, mouseDragged and mouseReleased functions if defined.
	// Arrange for global mouse variables to be set before calling user callbacks.
	mouseIsPressed = false;
	mouseX = 0;
	mouseY = 0;
	pmouseX = 0;
	pmouseY = 0;
	var setMouse = function () {
		mouseX = event.clientX;
		mouseY = event.clientY;
	}
	renderer.domElement.addEventListener ( 'mousedown', function () {
		setMouse();
		mouseIsPressed = true; 
		if (typeof mousePressed !== 'undefined') mousePressed();
	});
	renderer.domElement.addEventListener ( 'mousemove', function () { 
		pmouseX = mouseX;
		pmouseY = mouseY;
		setMouse();
		if (mouseIsPressed) {
			if (typeof mouseDragged !== 'undefined') mouseDragged(); 
		}
		if (typeof mouseMoved !== 'undefined') mouseMoved();
	});
	renderer.domElement.addEventListener ( 'mouseup', function () { 
		mouseIsPressed = false; 
		if (typeof mouseReleased !== 'undefined') mouseReleased(); 
	});
	renderer.domElement.addEventListener ( 'dblclick', function () { 
		setMouse();
		mouseIsPressed = true; 
		if (typeof doubleClick !== 'undefined') doubleClick(); 
	});

	// If a setup function is defined, call it
	if (typeof setup !== 'undefined') setup();

	// First render
	render();
}

// 
// Reshape callback
//
function resize() {
	width = window.innerWidth -20;
	height = window.innerHeight -20;
	camera.right = width;
	camera.bottom = height;
	camera.updateProjectionMatrix();
	renderer.setSize(width,height);
	render();
}

//------------------------------------------------------------
//
// User code from here on 
//
//------------------------------------------------------------

var material; 									// A line material
var default_dist = 20; 							// Default distance for condition testing
var edit_mode = {"poly": -1, "mode": -1};; 		// Current polygon editing state
var polygons = [];								// Array of existing polygons
var ph_geo = new THREE.Geometry();				// Placeholder geometry for any operation
var new_line;									// Current line being created
var click_timer = 50;							// Time since last click
var time_to_wait = 20;							// Time to identify a double click

//
// The render callback
//
function render () {
	if (click_timer < time_to_wait+10) click_timer += 1;
	// If a new polygon is being created:
	if (edit_mode["mode"] == "create_new"){
		var p = new THREE.Vector3 (mouseX,mouseY,0);
		// Clones placeholder geometry to line geometry:
		var geometry = ph_geo.clone();
		geometry.vertices.push(p);
		new_line.geometry = geometry;
	}
	// Updates the scene:
	requestAnimationFrame( render );
	renderer.render( scene, camera );
};

function setup () {
	material = new THREE.LineBasicMaterial ( {color:0xffffff, depthWrite:false, linewidth : 4 } );
}


function mousePressed() {
	if ((click_timer <= time_to_wait) && (edit_mode["mode"] == -1)){
		return;
	} else {
		click_timer = 0;
		// Checks if a polygon was hit by the mouse:
		var polygon_hit = -1;
		for (var k=polygons.length-1; k>=0; k--){
			if (polygon_hit == -1 && inside([mouseX,mouseY], polygons[k])) polygon_hit = k;
		}
		
		// If no objects are being edited at the moment:
		if ((edit_mode["mode"] == -1) && (polygon_hit == -1)){
			// States the creation of the new polygon:
			edit_mode["mode"] = "create_new";
			// Creates a new line to start drawing the polygon:
			var geometry = new THREE.Geometry();
			ph_geo.points = [];
			var p = new THREE.Vector3 (mouseX,mouseY,0);
			ph_geo.vertices.push(p);
			geometry.vertices.push (p);	
			ph_geo.points.push(p);
			var line = new THREE.Line (geometry, material);
			// Adds created line to the scene:
			new_line = line;
			scene.add(line);
		// If a polygon is being created at the moment:
		} else if (edit_mode["mode"] == "create_new"){
			var p = new THREE.Vector3 (mouseX,mouseY,0);
			// Checks to see if polygon should be closed:
			if ((p.distanceTo(ph_geo.vertices[0]) < default_dist) && (ph_geo.vertices[ph_geo.vertices.length-1].x != p.x) && (ph_geo.vertices[ph_geo.vertices.length-1].y != p.y)){
				// Adds the geometry to the line and finishes the editing process:
				ph_geo.vertices.push(ph_geo.vertices[0]);
				new_line.geometry = ph_geo;
				// Creates the resulting polygon and adds it to the scene:
				var shape = new THREE.Shape(new_line.geometry.vertices);
				var extrudeSettings = { amount: 8, bevelEnabled: false, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };
				var geometry = new THREE.ExtrudeGeometry( shape , extrudeSettings);
				var material2 = new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff , clipIntersection: true } );
				var mesh = new THREE.Mesh( geometry, material2 );
				mesh.pinpoint = new THREE.Vector2(0, 0);
				mesh.id = polygons.length;
				mesh.geometry.points = [];
				mesh.geometry.points = ph_geo.points;
				scene.remove(new_line);
				polygons.push(mesh);
				scene.add( mesh );
				ph_geo = new THREE.Geometry();
				edit_mode["mode"] = -1;
			} else if  ((ph_geo.vertices[ph_geo.vertices.length-1].x != p.x) && (ph_geo.vertices[ph_geo.vertices.length-1].y != p.y)){
				// Adds the next point to the newborn polygon:
				ph_geo.vertices.push(p);
				ph_geo.points.push(p);
			}
		} else if (polygon_hit != -1){
			if (polygons[ polygon_hit ].parent == scene){
				edit_mode["mode"] = "translate";
				edit_mode["poly"] = polygon_hit;
				edit_mode["points"] = [mouseX, mouseY];
			} else {
				edit_mode["mode"] = "rotate";
				edit_mode["poly"] = polygon_hit;
				edit_mode["points"] = [mouseX, mouseY];
			}
		}
	}
}

function doubleClick() {
	var collided = [];
	// Checks for collision with every polygon:
	for (var i=polygons.length-1; i>=0; i--){
		
		// Checks for collision:
		if ( inside([mouseX, mouseY], polygons[i]) ){
			
			// Adds polygon to the list of collisions:
			if (collided.length < 2) collided.push(i);
			
		}
	}

	// Checks if more than one polygon collided:
	if (collided.length == 2){
		var i_front = collided[0];
		var i_back = collided[1];
		// Checks if polygon on the back has a father:
		if (polygons[i_back].parent == scene){
			
			applyParenthood(polygons[i_front], polygons[i_back]);
			
		// Checks if polygon on the front has a father:
		} else if ((polygons[i_front].parent == scene) && (checkParentLoop(polygons[i_back], i_front))){
			
			applyParenthood(polygons[i_back], polygons[i_front]);
			
		}
		console.log("Pai do poligono " + i_back + ": " + polygons[i_back].parent.id);
		console.log("Pai do poligono " + i_front + ": " + polygons[i_front].parent.id);
	}
}


function mouseDragged() {
	// Checks to see if a polygon is being dragged:
	if (edit_mode["mode"] == "translate"){
		var i_poly = edit_mode["poly"];
		var poly = polygons[i_poly];
		var org_mouse_x = edit_mode["points"][0];
		var org_mouse_y = edit_mode["points"][1];
		
		// Calculates the distance to translate:
		var dist_x = mouseX - org_mouse_x;
		var dist_y = mouseY - org_mouse_y;
		
		// Applies the translation:
		poly.position.copy(new THREE.Vector3 (poly.matrix.elements[12] + dist_x, poly.matrix.elements[13] + dist_y, poly.matrix.elements[14] + 0));
		
		edit_mode["points"][0] += dist_x;
		edit_mode["points"][1] += dist_y;
			
	} else if (edit_mode["mode"] == "rotate"){
		
		var i_poly = edit_mode["poly"];
		var poly = polygons[i_poly];
		var pinpoint = new THREE.Vector4(1, 1, 0, 1);
		pinpoint.applyMatrix4(poly.matrix);
		var org_mouse_x = edit_mode["points"][0];
		var org_mouse_y = edit_mode["points"][1];
		var axis = new THREE.Vector3(0, 0, 1);
		
		// Calculates the angle of the rotation:
		var rotateStart = new THREE.Vector3( org_mouse_x - pinpoint.x, org_mouse_y - pinpoint.y, 0);
		var rotateEnd = new THREE.Vector3( mouseX - pinpoint.x, mouseY - pinpoint.y, 0);
		var signed_angle = Math.atan2(rotateEnd.y, rotateEnd.x) - Math.atan2(rotateStart.y, rotateStart.x);
		
		// Applies the rotation:
		var quaternion = new THREE.Quaternion();
	    quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), signed_angle);
	    poly.quaternion.copy(quaternion);
	}
}


function mouseReleased() {
	if ((edit_mode["mode"] == "translate") || (edit_mode["mode"] == "rotate")){
		edit_mode["mode"] = -1;
	}
}


// Function to check if a point is inside of a poly:
function inside(point, poly) {
	
	var vs = new Array(poly.geometry.points.length);
	// Builds an array containing lists of the points that define the polygon:
	for (var j=0; j<poly.geometry.points.length; j++){
		vs[j] = new Array(2);
		// Retrieves coordinates of points taking into account the matrix transformations:
		vec4 = new THREE.Vector4(poly.geometry.points[j].x, poly.geometry.points[j].y, 0, 1);
		vec4.applyMatrix4(poly.matrixWorld);
		vs[j][0] = ( vec4.x );
		vs[j][1] = ( vec4.y );
	}
	
    // Ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

// Function to add a pinpoint to a given point:
function addPinpoint(mouseX, mouseY, father){
	// Adds a pinpoint:
	var geometry_outer = new THREE.SphereGeometry(9);
	var material_outer = new THREE.MeshBasicMaterial( {color: 0xFFFFFF} );
	var sphere_outer = new THREE.Mesh( geometry_outer, material_outer );
	
	sphere_outer.pinpoint = new THREE.Vector2(0,0,0);
	
	// Sets the spheres position:
	//vec4 = new THREE.Vector4(mouseX, mouseY, 5, 0);
	m4 = father.matrixWorld.clone();
	m4.getInverse(m4);
	sphere_outer.applyMatrix(m4);
	
	// Returns the pinpoint:
	return sphere_outer;
}

// Function to check if i_test is a relative of poly:
function checkParentLoop(poly, i_test){
	var temp = poly;
	var count_loop = 0;
	while (temp != scene){
		if (temp == polygons[i_test]){
			return false;
		} else {
			temp = temp.parent;
			console.log("hey");
		}
		count_loop++;
		if (count_loop > 80){
			return false;
		}
	}
	return true;
}


// Function to make a polygon father of another:
function applyParenthood(father, son){
	
	// Recalculates the geometry position:
	resetGeometry( son, mouseX, mouseY );
	
	// Removes child from scene:
    scene.remove( son );
	
	// Polygon on the front becomes its father:
	father.add( son );
	
	// Apply inverse:
	m4 = new THREE.Matrix4();
	m4 = father.matrixWorld.clone();
	m4.getInverse(m4);
	son.applyMatrix(m4);
	
	// Creates a pinpoint and adds it as a child:
	var pinpoint = addPinpoint(mouseX, mouseY, father);
	father.add( pinpoint );
	pinpoint.translateX(mouseX);
	pinpoint.translateY(mouseY);
	pinpoint.translateZ(5);
	son.pinpoint = pinpoint;
	
}

// Function to translate a geometry by a certain offset and then compensate the translation in the polygon matrix:
function resetGeometry(poly, mouseX, mouseY){
	// Puts the geometry on origin:
	vec4 = new THREE.Vector4( -mouseX, -mouseY, 0 );
	vec4.applyMatrix4(poly.matrix);
	poly.geometry.translate(vec4.x, vec4.y, 0);
	var old_transforms = poly.matrix.clone();
	old_transforms.getInverse(old_transforms);
	poly.applyMatrix(old_transforms);
	// Updates geometry points:
	for (var i=0; i<poly.geometry.points.length; i++){
		poly.geometry.points[i].x += vec4.x;
		poly.geometry.points[i].y += vec4.y;
	}
	// Puts the polygon back to its place:
	poly.position.set(mouseX, mouseY, 0);
	render();
}

function findEldestParent(temp){
    while (temp.parent != scene){
		temp = temp.parent;
	}
	return temp;
}



init();
