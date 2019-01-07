import * as THREE from 'three';
import { CopyShader, ExtrudeBufferGeometry, OBJLoader2, Path } from 'three';

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
        this.uvBuffer = new Float32Array(LineGeometryBuilder.MAX * 3);
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
        const normal0 = new THREE.Vector3();
        const normal1 = new THREE.Vector3();
        const extrudeBase = new THREE.Vector3();
        const extrudeInt0 = new THREE.Vector3();
        const extrudeInt1 = new THREE.Vector3();
        const P = new THREE.Vector3();
        let distance = 0;

        let p0: THREE.Vector3;
        const emitVertexRaw = (ox: number, oy: number, oz: number, ux: number, uy: number, uz: number) => {
            this.positionBuffer[vertexIndex * 3] = p0.x + ox;
            this.positionBuffer[vertexIndex * 3 + 1] = p0.y + oy;
            this.positionBuffer[vertexIndex * 3 + 2] = p0.z + oz;

            // normals !
            this.uvBuffer[vertexIndex * 3] = ux;
            this.uvBuffer[vertexIndex * 3 + 1] = uy;
            this.uvBuffer[vertexIndex * 3 + 2] = uz;

            ++vertexIndex;
        }

        const emitVertex = (offset: THREE.Vector3, ux: number, uy: number, uz: number) => {
            emitVertexRaw(offset.x, offset.y, offset.z, ux, uy, uz);
        }

        const emitFace = (o1: number, o2: number, o3: number) => {
            this.indexBuffer[index++] = vertexIndex + o1;
            this.indexBuffer[index++] = vertexIndex + o2;
            this.indexBuffer[index++] = vertexIndex + o3;
        }

        for(let i = 0; i < points.length; i++) {
            p0 = points[i];
            const last = (i === points.length - 1);
            const p1 = last ? undefined : points[i+1];

            if (i === 0) {
                delta.copy(p1!);
                delta.sub(p0);
                normal0.set(-delta.y, delta.x, 0);
                normal0.normalize();
            }
            const currentDistance = delta.length();

            // NOTE line up vector is hardcoded to (0,0,1)

            let extrudeFactor = 1;
            let turnRight: boolean = false;
            if (i !== 0 && p1 !== undefined) {
                delta.copy(p1);
                delta.sub(p0);
                normal1.set(-delta.y, delta.x, 0);

                const crossProductMagnitute = normal0.x * normal1.y - normal0.y * normal1.x;
                // determine, if we go upward
                turnRight = crossProductMagnitute < 0;

                normal1.normalize();
                const dotProduct = normal0.dot(normal1);
                const angle = Math.acos(dotProduct);
                extrudeFactor = 1/Math.cos(angle/2);
                console.log("x", p0, p1, normal0.clone(), normal1.clone(), dotProduct, angle, extrudeFactor, turnRight);

                extrudeBase.copy(normal0).add(normal1);
                extrudeBase.normalize();

                extrudeBase.multiplyScalar(extrudeFactor);
                if (!turnRight) {
                    extrudeBase.negate();
                }

                extrudeInt0.copy(extrudeBase);
                extrudeInt0.negate();
                extrudeInt1.copy(extrudeInt0);

                if (turnRight) {
                    extrudeInt0.add(normal0).add(normal0);
                    extrudeInt1.add(normal1).add(normal1);
                } else {
                    extrudeInt0.sub(normal0).sub(normal0);
                    extrudeInt1.sub(normal1).sub(normal1);
                }

                normal0.copy(normal1);
            } else {
                extrudeBase.copy(normal0);
            }

            if (i === 0) {
                // startcap, upper point
                emitVertexRaw(extrudeBase.x - extrudeBase.y, extrudeBase.y + extrudeBase.x, extrudeBase.z + extrudeBase.z, -1, 1, 0);

                // lower
                emitVertexRaw(-extrudeBase.x - extrudeBase.y, -extrudeBase.y + extrudeBase.x, - extrudeBase.z + extrudeBase.z, -1, -1, 0);

                emitFace(-1, 0, -2);
                emitFace(-1, 1, 0);
            }

            if (i > 0 && p1 !== undefined) {
                if (turnRight) {
                    console.log('X', i, turnRight)
                    emitVertex(extrudeInt0, 0, 1, distance);
                    emitVertex(extrudeBase, -1, 1, distance);
                    emitVertex(extrudeInt1, 0, 1, distance);
                    emitVertex(P.copy(extrudeBase).negate(), 0, -1, distance);

                    emitFace(-4, -6, -5);
                    emitFace(-4, -5, -1);
                    emitFace(-3, -4, -1);
                    emitFace(-2, -3, -1);

                } else {
                    console.log('X', i, turnRight)
                    emitVertex(extrudeInt0, 0, -1, distance);
                    emitVertex(extrudeBase, 0, -1, distance);
                    emitVertex(P.copy(extrudeBase).negate(), 0, 1, distance);
                    emitVertex(extrudeInt1, 0, -1, distance);

                    emitFace(-2, -6, -5);
                    emitFace(-2, -5, -4);
                    emitFace(-2, -4, -3);
                    emitFace(-1, -2, -3);
                }
            } else {
                emitVertex(extrudeBase, 0, 1, distance);
                emitVertex(P.copy(extrudeBase).negate(), 0, -1, distance);

                if (i === points.length - 1) {
                    emitFace(-2, -4, -3);
                    emitFace(-2, -3, -1);
                }
            }

            distance += currentDistance;
        }
        this.vertexCount = vertexIndex;
        this.indexCount = index;
    }

    buildGeometry() {
        const geometry = new THREE.BufferGeometry();
        this.positionBuffer = this.positionBuffer.slice(0, this.vertexCount * 3);
        this.uvBuffer = this.uvBuffer.slice(0, this.vertexCount * 3);
        this.normalsBuffer = this.normalsBuffer.slice(0, this.vertexCount * 3);
        this.indexBuffer = this.indexBuffer.slice(0, this.indexCount);

        geometry.addAttribute( 'position', new THREE.BufferAttribute( this.positionBuffer, 3 ) );

        // note, 3JS requires that uv is 2d, we need 3d uv
        // maybe, we can add 3rd attribute in separate, 1d attribute
        geometry.addAttribute( 'uvx', new THREE.BufferAttribute( this.uvBuffer, 3 ) );
        //geometry.addAttribute( 'normal', new THREE.BufferAttribute( this.normalsBuffer, 3 ) );
        geometry.setIndex(new THREE.BufferAttribute(this.indexBuffer, 1));
        return geometry;
    }
}
function createStreetGeometry() {

    const b = new LineGeometryBuilder();
    b.addLine([
        new THREE.Vector3(-3, 0, 0),
        new THREE.Vector3(0, 0, 0)
        //new THREE.Vector3(3, -1, 0)
    ])
    b.addLine([
         new THREE.Vector3(0, 0, 0),
         new THREE.Vector3(7, 2, 0),
     ])

     b.addLine([
         new THREE.Vector3(-2, 4, 0),
         new THREE.Vector3(1, -2.5, 0),
         new THREE.Vector3(4, -2.5, 0)
     ]);

    return b.buildGeometry();
}

function createStreetFinalMaterial(texture: THREE.Texture) {
    const material = new THREE.ShaderMaterial({
        name: "StreetDrawPass",
        vertexShader: `
        attribute vec3 uvx;
        varying vec3 vUv;

            void main() {
                vUv = uvx;

                gl_Position =   projectionMatrix *
                                modelViewMatrix *
                                vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vUv;
            uniform sampler2D prePassTexture;
            uniform vec3 resolution;

            vec3 RED = vec3(1.0, 0.0, 0.0);
            vec3 fg = vec3(0.5, 0.5, 0.5);
            vec3 bg = vec3(0.2, 0.2, 0.2);
            vec3 dash = vec3(0.8, 0.8, 0.8);

            const float dashWidth = 0.1;
            const float dashSize = 0.3;
            const float dashGap = 0.3;

            float dashLen = dashSize + dashGap;

            float reverse(float v) {
                return abs(1.0 - v);
            }
            void main() {
                vec2 screenPos = vec2(gl_FragCoord.x / resolution.x, gl_FragCoord.y / resolution.y);
                vec4 prePass = texture2D(prePassTexture, screenPos);

                float inForegroundRaw = reverse(step(prePass.r, 0.01));
                float inOutlineRaw = reverse(step(prePass.g, 0.01));
                if (inForegroundRaw < 1.0 && inOutlineRaw < 1.0) {
                    discard;
                }

                // why ???
                float notInIntersetion = step(prePass.r, 2.0/4.0);

                float inForeground = inForegroundRaw;// * reverse(inOutlineRaw);
                float inOutline = inOutlineRaw;

                float inDashH = step(mod(vUv.z, dashLen), dashSize);
                float inDashV = step(abs(vUv.y), dashWidth);

                vec3 col = RED;
                col = mix(col, bg, inOutlineRaw);
                col = mix(col, fg, inForeground);
                col = mix(col, dash, notInIntersetion * inDashV * inDashH);

                gl_FragColor = vec4(col, 0);
            }
        `,
        uniforms: {
            prePassTexture: <THREE.IUniform>{
                // type: "t",
                value: texture
            },
            resolution: {
                value: new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
            }
        }
        //wireframe: true
    });
    return material;
}

function createStreetPrePassMaterial() {
    const material = new THREE.ShaderMaterial({
        name: "StreetPrePass",
        vertexShader: `
            attribute vec3 uvx;
            varying vec3 vUv;
            void main() {
                vUv = uvx;
                gl_Position =   projectionMatrix *
                                modelViewMatrix *
                                vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vUv;

            const float outlineWidth = 0.1;

            void main() {
                float centerDist = sqrt(vUv.y * vUv.y + vUv.x * vUv.x);
                if (centerDist > 1.0) {
                    discard;
                }
                float isFg = step(centerDist, 1.0 - outlineWidth);
                float isBg = abs(1.0 - isFg);

                gl_FragColor = vec4(isFg/4.0, isBg/4.0, 1.0, 1.0);
            }
        `
    });
    material.transparent = true;
    material.blending = THREE.CustomBlending;
    material.premultipliedAlpha = false;
    material.blendEquation = THREE.AddEquation;
    material.blendDst = THREE.OneFactor;
    material.blendSrc = THREE.OneFactor;
    return material;
}

function streetsSampleApp(canvas: HTMLCanvasElement) {
    console.log("start");
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({antialias:true, canvas});
    renderer.autoClear = false;

    renderer.setClearColor("#000000");

    renderer.setSize( window.innerWidth, window.innerHeight );
    const dpr = window.devicePixelRatio
    renderer.setPixelRatio(dpr);

    // for some reasons, rt, when used for read (in second pass, cannot be used) to
    // write in next frame, so cycle trough two buffers, so each frame uses other
    // renderTarget/texture
    const pass1Targets = [
        new THREE.WebGLRenderTarget(window.innerWidth*dpr, window.innerHeight*dpr),
        new THREE.WebGLRenderTarget(window.innerWidth*dpr, window.innerHeight*dpr)
    ];

    const streetGeometry = createStreetGeometry();

    const finalPassMaterial = createStreetFinalMaterial(pass1Targets[0].texture);

    const streetPrePassScene = new THREE.Scene();

    const streetsPrePassMesh = new THREE.Mesh( streetGeometry, createStreetPrePassMaterial() );
    const streetsFinalPassMesh = new THREE.Mesh( streetGeometry, finalPassMaterial );

    streetsPrePassMesh.position.set(0, 0, -1);
    streetsFinalPassMesh.position.set(0,0,-1);

    streetPrePassScene.add(streetsPrePassMesh);

    scene.add( streetsFinalPassMesh);
    //scene.add( cube );

    // Render Loop
    let frame = 0;
    const render = function () {
        const pass1Target = pass1Targets[frame++ % 2];
        requestAnimationFrame( render );

        // Render the street pre-pass
        renderer.setRenderTarget(pass1Target);
        renderer.clear();
        finalPassMaterial.uniforms.prePassTexture.value = pass1Target.texture;

        renderer.render(streetPrePassScene, camera, pass1Target);

        // Render final streets
        renderer.setRenderTarget();
        renderer.render(scene, camera);
    };

    console.log("start");
    render();
}

streetsSampleApp(document.getElementById("canvas") as HTMLCanvasElement);
