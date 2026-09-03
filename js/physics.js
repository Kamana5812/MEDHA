/**
 * MEDHA - Interactive 3D Physics Playground
 * Powered by Three.js and Cannon-es
 */

// ==========================================================================
// 1. CONFIGURATION
// ==========================================================================
const isMobileDevice = window.matchMedia('(max-width: 768px)').matches;
const preferNoMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PHYSICS_CONFIG = {
    maxObjects: isMobileDevice ? 15 : 25,
    pixelRatio: Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2),
    colors: [0x6d28d9, 0x8b5cf6, 0x06b6d4, 0x38bdf8, 0xffffff, 0xc4b5fd]
};

// ==========================================================================
// 2. GLOBALS
// ==========================================================================
let physicsScene, physicsCamera, physicsRenderer, world;
let physicsObjects = [];
let interactiveMeshes = [];
let globalPhysicsMaterial = null;

// Interaction State
let dragBody = null;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let pointerPosition = new THREE.Vector2();
let physicsRaycaster = new THREE.Raycaster();
let isDragging = false;
let lastPointerTime = 0;
let prevIntersect = new THREE.Vector3();
let currentVelocity = new THREE.Vector3();

// UI Elements
const DOM_PHYSICS = {
    canvas: document.getElementById('physics-canvas'),
    spawnBtn: document.getElementById('spawn-object'),
    gravityBtn: document.getElementById('gravity-toggle'),
    colorBtn: document.getElementById('randomize-colors'),
    resetBtn: document.getElementById('reset-scene'),
    statusGravity: document.getElementById('status-gravity'),
    statusObjects: document.getElementById('status-objects'),
    statusEnergy: document.getElementById('status-energy'),
    statusImpact: document.getElementById('status-impact'),
    flashOverlay: document.getElementById('playground-flash')
};

// Gravity States
let gravityState = 0; // 0: Down, 1: Up, 2: Left, 3: Right
const gravityVectors = [
    new CANNON.Vec3(0, -9.82, 0),
    new CANNON.Vec3(0, 9.82, 0),
    new CANNON.Vec3(-9.82, 0, 0),
    new CANNON.Vec3(9.82, 0, 0)
];
const gravityLabels = ["Down", "Up", "Left", "Right"];

// ==========================================================================
// 3. INITIALIZATION
// ==========================================================================
function initPhysicsPlayground() {
    if (!DOM_PHYSICS.canvas || typeof CANNON === 'undefined' || typeof THREE === 'undefined') return;

    // --- THREE.JS SETUP ---
    physicsScene = new THREE.Scene();
    
    physicsCamera = new THREE.PerspectiveCamera(45, DOM_PHYSICS.canvas.clientWidth / DOM_PHYSICS.canvas.clientHeight, 0.1, 100);
    // Position camera centrally and far back enough to see the floor and ceiling
    physicsCamera.position.set(0, 0, 26);
    physicsCamera.lookAt(0, 0, 0);

    physicsRenderer = new THREE.WebGLRenderer({ 
        canvas: DOM_PHYSICS.canvas, 
        alpha: true, 
        antialias: !isMobileDevice 
    });
    physicsRenderer.setPixelRatio(PHYSICS_CONFIG.pixelRatio);
    physicsRenderer.setSize(DOM_PHYSICS.canvas.clientWidth, DOM_PHYSICS.canvas.clientHeight);
    
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    physicsScene.add(ambient);
    
    const pointLight1 = new THREE.PointLight(0x06b6d4, 1.5, 50);
    pointLight1.position.set(10, 15, 10);
    physicsScene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x8b5cf6, 1.5, 50);
    pointLight2.position.set(-10, 15, -10);
    physicsScene.add(pointLight2);

    // --- CANNON-ES SETUP ---
    world = new CANNON.World();
    world.gravity.copy(gravityVectors[gravityState]);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 30; // Increased to reduce tunneling
    world.solver.tolerance = 0.001;
    
    // Physics Materials
    const defaultMat = new CANNON.Material();
    globalPhysicsMaterial = defaultMat;
    const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
        friction: 0.3,
        restitution: 0.6 // Bounciness
    });
    world.addContactMaterial(globalPhysicsMaterial);

    // Track High Impacts
    let lastImpactForce = 0;
    world.addEventListener("collide", (e) => {
        // Relative velocity of collision
        const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
        // F = ma approx (using momentum change)
        const massA = e.body.mass || 1;
        const massB = e.contact.bi.mass || 1;
        const force = Math.abs(relativeVelocity) * (massA + massB);
        
        if (force > 5) {
            lastImpactForce = force * 10; // Scaling for dramatic visual metric
            if (DOM_PHYSICS.statusImpact) {
                DOM_PHYSICS.statusImpact.querySelector('.metric-value').innerText = `${lastImpactForce.toFixed(0)} N`;
            }
            // Trigger Flash
            if (force > 30 && DOM_PHYSICS.flashOverlay) {
                DOM_PHYSICS.flashOverlay.classList.remove("flash-active");
                void DOM_PHYSICS.flashOverlay.offsetWidth; // Trigger reflow
                DOM_PHYSICS.flashOverlay.classList.add("flash-active");
            }
        }
    });

    createBoundaries(globalPhysicsMaterial);

    // Initial Objects
    for (let i = 0; i < 8; i++) {
        setTimeout(() => spawnRandomObject(defaultMat), i * 150);
    }

    setupPhysicsInteractions();
    setupPlaygroundScrollAnimation();
    
    gsap.ticker.add(animatePhysicsLoop);
    window.addEventListener('resize', handlePhysicsResize);
}

// ==========================================================================
// 4. BOUNDARIES & ENVIRONMENT
// ==========================================================================
function createBoundaries(material) {
    const wallThickness = 1;
    const size = 15;

    // Floor
    createWall(new CANNON.Vec3(0, -size/2, 0), new CANNON.Vec3(-Math.PI/2, 0, 0), material);
    // Ceiling
    createWall(new CANNON.Vec3(0, size, 0), new CANNON.Vec3(Math.PI/2, 0, 0), material);
    // Left Wall
    createWall(new CANNON.Vec3(-size/1.2, 0, 0), new CANNON.Vec3(0, Math.PI/2, 0), material);
    // Right Wall
    createWall(new CANNON.Vec3(size/1.2, 0, 0), new CANNON.Vec3(0, -Math.PI/2, 0), material);
    // Back Wall
    createWall(new CANNON.Vec3(0, 0, -5), new CANNON.Vec3(0, 0, 0), material);
    // Front Wall (Invisible barrier near camera)
    createWall(new CANNON.Vec3(0, 0, 10), new CANNON.Vec3(0, Math.PI, 0), material);

    // Floor Visual
    const floorGeo = new THREE.PlaneGeometry(30, 15);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e, 
        transparent: true, 
        opacity: 0.2,
        wireframe: true // Grid floor look
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -size/2;
    floorMesh.rotation.x = -Math.PI / 2;
    physicsScene.add(floorMesh);
}

function createWall(position, rotation, material) {
    const wallBody = new CANNON.Body({ mass: 0, material: material });
    wallBody.addShape(new CANNON.Plane());
    wallBody.position.copy(position);
    wallBody.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z, "XYZ");
    world.addBody(wallBody);
}

// ==========================================================================
// 5. OBJECT SPAWNING & PHYSICS SYNC
// ==========================================================================
function spawnRandomObject(material = world.defaultMaterial) {
    if (physicsObjects.length >= PHYSICS_CONFIG.maxObjects) {
        removeOldestObject();
    }

    const types = ['box', 'sphere', 'cylinder', 'icosahedron'];
    const type = types[Math.floor(Math.random() * types.length)];
    const size = 0.6 + Math.random() * 0.8;
    
    let geo, shape;
    
    switch(type) {
        case 'box':
            geo = new THREE.BoxGeometry(size, size, size);
            shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
            break;
        case 'sphere':
            geo = new THREE.SphereGeometry(size/2, 16, 16);
            shape = new CANNON.Sphere(size/2);
            break;
        case 'cylinder':
            geo = new THREE.CylinderGeometry(size/2, size/2, size, 16);
            shape = new CANNON.Cylinder(size/2, size/2, size, 16);
            break;
        case 'icosahedron':
            geo = new THREE.IcosahedronGeometry(size/2);
            shape = new CANNON.Sphere(size/2); // Approximate with sphere for better performance
            break;
    }
    
    const color = PHYSICS_CONFIG.colors[Math.floor(Math.random() * PHYSICS_CONFIG.colors.length)];
    const meshMat = new THREE.MeshStandardMaterial({ 
        color: color, 
        emissive: color, 
        emissiveIntensity: 0.2,
        roughness: 0.2,
        metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geo, meshMat);
    
    // Spawn position
    const x = (Math.random() - 0.5) * 10;
    const y = 8 + Math.random() * 5;
    const z = (Math.random() - 0.5) * 4;
    
    mesh.position.set(x, y, z);
    physicsScene.add(mesh);
    interactiveMeshes.push(mesh);
    
    const body = new CANNON.Body({
        mass: size * 2, // Mass based on size
        position: new CANNON.Vec3(x, y, z),
        material: material
    });
    body.addShape(shape);
    // Add slight random rotation initially
    body.angularVelocity.set(Math.random(), Math.random(), Math.random());
    world.addBody(body);
    
    const id = Date.now() + Math.random();
    
    let lastCollisionTime = 0;
    
    // Collision Event
    body.addEventListener("collide", (e) => {
        if (preferNoMotion) return;
        
        const now = performance.now();
        if (now - lastCollisionTime < 100) return; // Throttle collision effects (100ms cooldown per object)
        
        // Only fire effect on hard impacts
        const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
        if (Math.abs(relativeVelocity) > 3) {
            lastCollisionTime = now;
            // GSAP Visual Polish (Scale Pulse & Flash)
            gsap.fromTo(mesh.scale, 
                { x: 1.3, y: 1.3, z: 1.3 }, 
                { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" }
            );
            if(meshMat.emissiveIntensity !== undefined) {
                gsap.fromTo(meshMat, 
                    { emissiveIntensity: 1.5 }, 
                    { emissiveIntensity: 0.2, duration: 0.4 }
                );
            }
        }
    });

    physicsObjects.push({ id, mesh, body, type, mat: meshMat });
    updateUIStatus();
}

function removeOldestObject() {
    const obj = physicsObjects.shift();
    if (obj) {
        physicsScene.remove(obj.mesh);
        world.removeBody(obj.body);
        interactiveMeshes = interactiveMeshes.filter(m => m !== obj.mesh);
        obj.mesh.geometry.dispose();
        obj.mat.dispose();
    }
}

// ==========================================================================
// 6. UI & CONTROLS
// ==========================================================================
function updateUIStatus() {
    if (DOM_PHYSICS.statusObjects) DOM_PHYSICS.statusObjects.innerText = `Objects: ${physicsObjects.length}`;
    if (DOM_PHYSICS.statusGravity) DOM_PHYSICS.statusGravity.innerText = `Gravity: ${gravityLabels[gravityState]}`;
    
    // Pulse UI lightly
    if (!preferNoMotion && DOM_PHYSICS.statusObjects) {
        gsap.fromTo(DOM_PHYSICS.statusObjects, { opacity: 0.5 }, { opacity: 1, duration: 0.3 });
    }
}

// ==========================================================================
// 7. DRAGGING & THROWING (INTERACTIONS)
// ==========================================================================
function setupPhysicsInteractions() {
    const canvas = DOM_PHYSICS.canvas;
    
    // UI Button Listeners
    if (DOM_PHYSICS.spawnBtn) {
        DOM_PHYSICS.spawnBtn.addEventListener('click', () => {
            spawnRandomObject(globalPhysicsMaterial);
        });
    }
    
    if (DOM_PHYSICS.gravityBtn) {
        DOM_PHYSICS.gravityBtn.addEventListener('click', () => {
            gravityState = (gravityState + 1) % 4;
            world.gravity.copy(gravityVectors[gravityState]);
            
            // Wake all sleeping bodies to apply new gravity
            physicsObjects.forEach(o => o.body.wakeUp());
            
            updateUIStatus();
            DOM_PHYSICS.gravityBtn.innerHTML = `Change Gravity <span aria-hidden="true">&rarr;</span>`;
        });
    }
    
    if (DOM_PHYSICS.colorBtn) {
        DOM_PHYSICS.colorBtn.addEventListener('click', () => {
            physicsObjects.forEach(obj => {
                const color = PHYSICS_CONFIG.colors[Math.floor(Math.random() * PHYSICS_CONFIG.colors.length)];
                obj.mat.color.setHex(color);
                obj.mat.emissive.setHex(color);
            });
            gsap.fromTo(DOM_PHYSICS.colorBtn, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: "back.out(2)" });
        });
    }
    
    if (DOM_PHYSICS.resetBtn) {
        DOM_PHYSICS.resetBtn.addEventListener('click', () => {
            while(physicsObjects.length > 0) removeOldestObject();
            gravityState = 0;
            world.gravity.copy(gravityVectors[gravityState]);
            DOM_PHYSICS.gravityBtn.innerHTML = `Change Gravity`;
            updateUIStatus();
            
            for(let i=0; i<8; i++) {
                setTimeout(() => spawnRandomObject(globalPhysicsMaterial), i * 150);
            }
        });
    }

    // Canvas Pointer Events for Drag/Throw
    canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        pointerPosition.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerPosition.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        physicsRaycaster.setFromCamera(pointerPosition, physicsCamera);
        const intersects = physicsRaycaster.intersectObjects(interactiveMeshes);
        
        if (intersects.length > 0) {
            isDragging = true;
            const hitMesh = intersects[0].object;
            const pObj = physicsObjects.find(o => o.mesh === hitMesh);
            
            if (pObj) {
                // Prepare Cannon-es body for kinematic drag
                dragBody = pObj.body;
                dragBody.velocity.set(0, 0, 0);
                dragBody.angularVelocity.set(0, 0, 0);
                dragBody.type = CANNON.Body.KINEMATIC; // Allow manual positioning
                
                // Set drag plane to object's depth
                dragPlane.constant = -intersects[0].point.z;
                
                lastPointerTime = performance.now();
                prevIntersect.copy(intersects[0].point);
                
                // GSAP Feedback
                gsap.to(hitMesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.2 });
                if(pObj.mat) gsap.to(pObj.mat, { emissiveIntensity: 0.8, duration: 0.2 });
                
                canvas.style.cursor = 'grabbing';
            }
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        // Change cursor on hover
        if (!isDragging) {
            const rect = canvas.getBoundingClientRect();
            pointerPosition.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointerPosition.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            physicsRaycaster.setFromCamera(pointerPosition, physicsCamera);
            const intersects = physicsRaycaster.intersectObjects(interactiveMeshes);
            canvas.style.cursor = intersects.length > 0 ? 'grab' : 'default';
            return;
        }

        if (!dragBody) return;
        
        const rect = canvas.getBoundingClientRect();
        pointerPosition.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerPosition.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        physicsRaycaster.setFromCamera(pointerPosition, physicsCamera);
        const intersectPoint = new THREE.Vector3();
        physicsRaycaster.ray.intersectPlane(dragPlane, intersectPoint);
        
        if (intersectPoint) {
            const now = performance.now();
            const dt = (now - lastPointerTime) / 1000; // seconds
            
            if (dt > 0) {
                // Calculate velocity for realistic throw momentum
                currentVelocity.set(
                    (intersectPoint.x - prevIntersect.x) / dt,
                    (intersectPoint.y - prevIntersect.y) / dt,
                    (intersectPoint.z - prevIntersect.z) / dt
                );
            }
            
            // Move physics body manually
            dragBody.position.copy(intersectPoint);
            
            prevIntersect.copy(intersectPoint);
            lastPointerTime = now;
        }
    });

    const handlePointerRelease = () => {
        if (isDragging && dragBody) {
            // Restore physics
            dragBody.type = CANNON.Body.DYNAMIC;
            
            // Apply Throw Momentum
            // Clamp velocity to prevent physics explosions
            const maxV = 50;
            currentVelocity.clamp(new THREE.Vector3(-maxV, -maxV, -maxV), new THREE.Vector3(maxV, maxV, maxV));
            dragBody.velocity.copy(currentVelocity);
            
            // Restore visual scale
            const hitMesh = physicsObjects.find(o => o.body === dragBody)?.mesh;
            const pObj = physicsObjects.find(o => o.body === dragBody);
            
            if (hitMesh) gsap.to(hitMesh.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
            if (pObj && pObj.mat) gsap.to(pObj.mat, { emissiveIntensity: 0.2, duration: 0.2 });
            
            dragBody = null;
            isDragging = false;
            currentVelocity.set(0, 0, 0);
            canvas.style.cursor = 'grab';
        }
    };

    canvas.addEventListener('pointerup', handlePointerRelease);
    canvas.addEventListener('pointerleave', handlePointerRelease);
    canvas.addEventListener('pointercancel', handlePointerRelease);
}

// ==========================================================================
// 8. SCROLL & RESIZE
// ==========================================================================
function setupPlaygroundScrollAnimation() {
    if (typeof ScrollTrigger === 'undefined' || preferNoMotion) return;

    ScrollTrigger.create({
        trigger: ".playground",
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
        animation: gsap.timeline()
            // Gentle cinematic zoom that keeps the entire box in frame
            .to(physicsCamera.position, { y: 0, z: 20, ease: "none" }, 0)
    });
}

function handlePhysicsResize() {
    if(!physicsRenderer || !DOM_PHYSICS.canvas) return;
    const parent = DOM_PHYSICS.canvas.parentElement;
    
    physicsCamera.aspect = parent.clientWidth / parent.clientHeight;
    physicsCamera.updateProjectionMatrix();
    
    physicsRenderer.setSize(parent.clientWidth, parent.clientHeight);
}

// ==========================================================================
// 9. RENDER & PHYSICS LOOP
// ==========================================================================
let lastPhysicsTime = 0;

function animatePhysicsLoop(time) {
    if (!world || !physicsScene || !physicsCamera) return;

    // GSAP ticker 'time' is already in seconds.
    // Do NOT divide by 1000, otherwise dt becomes ~0.000016 and physics freezes mid-air.
    const dt = lastPhysicsTime ? (time - lastPhysicsTime) : 0;
    lastPhysicsTime = time;
    
    // Prevent huge jumps if tab was inactive
    const deltaTime = Math.min(dt, 0.1);

    world.step(1 / 60, deltaTime, 3);
    
    let totalKineticEnergy = 0;

    // Sync Three.js meshes with Cannon.js bodies & Calculate Energy
    for (let i = 0; i < physicsObjects.length; i++) {
        const obj = physicsObjects[i];
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
        
        // KE = 1/2 * m * v^2
        const v = obj.body.velocity;
        const speedSq = v.x*v.x + v.y*v.y + v.z*v.z;
        totalKineticEnergy += 0.5 * obj.body.mass * speedSq;
    }
    
    // Update HUD
    if (DOM_PHYSICS.statusEnergy) {
        DOM_PHYSICS.statusEnergy.querySelector('.metric-value').innerText = `${totalKineticEnergy.toFixed(1)} J`;
    }

    physicsRenderer.render(physicsScene, physicsCamera);
}

document.addEventListener("DOMContentLoaded", initPhysicsPlayground);
