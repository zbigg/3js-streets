import * as THREE from 'three';

console.log("hello2");

function createBackGroundGeometry() {
    const geometry = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.
    const vertices = new Float32Array( [
        -1.0, -1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0,  1.0,

        1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0
    ] );

    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

    const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.position.set(0,0,-1);
    return mesh;
}

function createStreetGeometry() {
    const geometry = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.
    const vertices = new Float32Array( [
        -1.0, -1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0,  1.0,

        1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0
    ] );

    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

    const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.position.set(0,0,-1);
    return mesh;
}

function streetsSampleApp(canvas: HTMLCanvasElement) {
    console.log("start");
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({antialias:true, canvas});

    renderer.setClearColor("#000000");

    renderer.setSize( window.innerWidth, window.innerHeight );

    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( { color: "#433F81" } );
    const cube = new THREE.Mesh( geometry, material );

    // Add cube to Scene
    scene.add( createBackGroundGeometry() );
    scene.add( cube );

    // Render Loop
    const render = function () {
        requestAnimationFrame( render );

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // Render the scene
        renderer.render(scene, camera);
    };

    console.log("start");
    render();
}

streetsSampleApp(document.getElementById("canvas") as HTMLCanvasElement);
