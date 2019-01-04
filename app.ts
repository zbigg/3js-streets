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

class LineGeometryBuilder {
    static MAX = 16536;

    positionBuffer: Float32Array;
    uvBuffer: Float32Array;
    normalsBuffer: Float32Array;
    indexBuffer: Uint16Array;

    vertexCount: number = 0;
    indexCount: number = 0;

    constructor() {
        this.positionBuffer = new Float32Array(LineGeometryBuilder.MAX * 3)
        this.uvBuffer = new Float32Array(LineGeometryBuilder.MAX * 2);
        this.normalsBuffer = new Float32Array(LineGeometryBuilder.MAX * 2);
        this.indexBuffer = new Uint16Array(LineGeometryBuilder.MAX);
    }

    addLine(points: THREE.Vector3[]) {
        if (points.length < 2) {
            return;
        }

        let vertexIndex = this.vertexCount;
        let index = this.indexCount;

        const delta = new THREE.Vector3();
        const normal = new THREE.Vector3();
        let distance = 0;

        for(let i = 0; i < points.length; i++) {
            const p0 = points[i];
            const last = i == points.length-1;
            const p1 = last ? undefined : points[i+1];

            if (i === 0) {
                delta.copy(p1!);
                delta.sub(p0);
            }
            const currentDistance = delta.length();

            // NOTE line up vector is hardcoded to (0,0,1)
            normal.set(-delta.y, delta.x, 0);

            if (i !== 0 && p1 !== undefined) {
                delta.copy(p1);
                delta.sub(p0);
                // delta is actually nextDelta
                normal.x = normal.x - delta.y;
                normal.y = normal.y + delta.x;
            }
            normal.normalize();

            this.positionBuffer[vertexIndex * 3] = p0.x + normal.x;
            this.positionBuffer[vertexIndex * 3 + 1] = p0.y + normal.y;
            this.positionBuffer[vertexIndex * 3 + 2] = p0.z + normal.z;

            this.normalsBuffer[vertexIndex * 3 ] = normal.x;
            this.normalsBuffer[vertexIndex * 3 + 1] = normal.y;
            this.normalsBuffer[vertexIndex * 3 + 2] = normal.z;

            this.uvBuffer[vertexIndex * 2] = distance;
            this.uvBuffer[vertexIndex * 2 + 1] = 1;

            ++vertexIndex;

            this.positionBuffer[vertexIndex * 3] = p0.x -normal.x;
            this.positionBuffer[vertexIndex * 3 + 1] = p0.y -normal.y;
            this.positionBuffer[vertexIndex * 3 + 2] = p0.z -normal.z;

            this.normalsBuffer[vertexIndex * 3] = -normal.x;
            this.normalsBuffer[vertexIndex * 3 + 1] = -normal.y;
            this.normalsBuffer[vertexIndex * 3 + 2] = -normal.z;

            this.uvBuffer[vertexIndex * 2] = distance;
            this.uvBuffer[vertexIndex * 2 + 1] = -1;

            ++vertexIndex;

            distance += currentDistance;

            if (i > 0) {
                this.indexBuffer[index++] = vertexIndex - 2;
                this.indexBuffer[index++] = vertexIndex - 4;
                this.indexBuffer[index++] = vertexIndex - 3;

                this.indexBuffer[index++] = vertexIndex - 2;
                this.indexBuffer[index++] = vertexIndex - 3;
                this.indexBuffer[index++] = vertexIndex - 1;
            }
        }
        this.vertexCount = vertexIndex;
        this.indexCount = index;
    }

    buildGeometry() {
        const geometry = new THREE.BufferGeometry();
        this.positionBuffer = this.positionBuffer.slice(0, this.vertexCount * 3);
        this.uvBuffer = this.uvBuffer.slice(0, this.vertexCount * 2);
        this.normalsBuffer = this.normalsBuffer.slice(0, this.vertexCount * 3);
        this.indexBuffer = this.indexBuffer.slice(0, this.indexCount);

        geometry.addAttribute( 'position', new THREE.BufferAttribute( this.positionBuffer, 3 ) );
        geometry.addAttribute( 'uv', new THREE.BufferAttribute( this.uvBuffer, 2 ) );
        //geometry.addAttribute( 'normal', new THREE.BufferAttribute( this.normalsBuffer, 3 ) );
        geometry.setIndex(new THREE.BufferAttribute(this.indexBuffer, 1));
        return geometry;
    }
}
function createStreetGeometry() {

    const b = new LineGeometryBuilder();
    b.addLine([
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(2, 0, 0)
    ])

    b.addLine([
        new THREE.Vector3(0, 2, 0),
        new THREE.Vector3(0, -2, 0)
    ]);

    console.log("X", b);

    //const material = new THREE.MeshBasicMaterial( { color: "#00ff00", wireframe: true } );
    const material = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 vUv;

            void main() {
                vUv = uv;

                gl_Position =   projectionMatrix *
                                modelViewMatrix *
                                vec4(position,1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;

            vec3 fg = vec3(0.5,0.5,0.5);
            vec3 bg = vec3(0.2,0.2,0.2);
            vec3 dash = vec3(1,1,1);

            const float outlineWidth = 0.1;
            const float dashWidth = 0.1;
            const float dashSize = 0.3;
            const float dashGap = 0.3;
            float dashLen = dashSize + dashGap;

            void main() {
                float inDash = step(mod(vUv.x, dashLen), dashSize);
                vec3 col = bg;
                col = mix(col, fg, step(abs(vUv.y), 1.0 - outlineWidth));
                col = mix(col, dash, step(abs(vUv.y), dashWidth) * inDash );

                gl_FragColor = vec4(col, 0);
            }
        `
    })
    const mesh = new THREE.Mesh( b.buildGeometry(), material );
    mesh.position.set(0, 0, -1);

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
    //scene.add( createBackGroundGeometry() );
    scene.add( createStreetGeometry());
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
