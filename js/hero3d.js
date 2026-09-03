/**
 * MEDHA - Three.js Hero Scene Implementation
 * Handles the cinematic interactive 3D universe.
 */

// ==========================================================================
// 1. CONFIGURATION
// ==========================================================================
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HERO_CONFIG = {
    particleCount: isMobile ? 80 : 250,
    pixelRatio: Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
    cameraZ: isMobile ? 10 : 8,
    colors: {
        core: 0x6d28d9, // Deep purple
        glow: 0x8b5cf6, // Violet
        accent: 0x06b6d4, // Cyan
        books: [0x4338ca, 0x0284c7, 0x7c3aed],
        particles: 0xc4b5fd
    }
};

// ==========================================================================
// 2. GLOBALS
// ==========================================================================
let scene, camera, renderer, sceneGroup;
let raycaster, mouse;
let interactiveObjects = [];
let hoveredObject = null;

// ==========================================================================
// 3. INITIALIZATION
// ==========================================================================
function initHero3D() {
    const canvas = document.querySelector('#hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    // Scene setup
    scene = new THREE.Scene();
    
    // Create a master group for everything so we can rotate the whole scene easily
    sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // Camera setup
    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, HERO_CONFIG.cameraZ);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(HERO_CONFIG.pixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // Interaction setup
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Build the scene
    setupHeroLights();
    buildObjects();
    setupHeroInteraction();
    setupHeroScrollAnimation();
    
    // Play Intro Animation
    playIntroAnimation();

    // Start render loop
    gsap.ticker.add(animateHero3D);

    // Handle resize
    window.addEventListener('resize', handleHeroResize);
}

// ==========================================================================
// 4. LIGHTING
// ==========================================================================
function setupHeroLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    sceneGroup.add(ambientLight);

    const mainPointLight = new THREE.PointLight(HERO_CONFIG.colors.glow, 2, 20);
    mainPointLight.position.set(0, 0, 0);
    sceneGroup.add(mainPointLight);

    const rimLight = new THREE.DirectionalLight(HERO_CONFIG.colors.accent, 1.5);
    rimLight.position.set(5, 5, -5);
    sceneGroup.add(rimLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, -2, 5);
    sceneGroup.add(fillLight);
}

// ==========================================================================
// 5. OBJECT CREATION
// ==========================================================================
function buildObjects() {
    createIntelligenceCore();
    createOrbitRings();
    
    if (!isMobile) {
        createGeometryObjects();
    }
    
    // Procedural objects
    createBook(-3, 2, -1, 0);
    createBook(3.5, 0, 1, 1);
    createBook(-2, -2.5, 0, 2);
    
    createAtom(2.5, 2.5, -2);
    createMolecule(-2.5, -1, 2);
    
    createMathSymbol('π', 3, -2, 0);
    createMathSymbol('Σ', -3.5, 1, 1);
    createMathSymbol('∞', 0, 3.5, -1);
    
    createParticles();
}

function createIntelligenceCore() {
    const coreGroup = new THREE.Group();
    
    // Inner glowing solid
    const innerGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const innerMat = new THREE.MeshStandardMaterial({
        color: HERO_CONFIG.colors.core,
        emissive: HERO_CONFIG.colors.glow,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerSphere);
    
    // Outer glass/transparent layer
    const outerGeo = new THREE.SphereGeometry(1.1, 32, 32);
    const outerMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.5
    });
    const outerSphere = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerSphere);
    
    sceneGroup.add(coreGroup);
    interactiveObjects.push(innerSphere); // Make interactable

    if (!prefersReducedMotion) {
        gsap.to(coreGroup.scale, {
            x: 1.05, y: 1.05, z: 1.05,
            duration: 2.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        gsap.to(coreGroup.rotation, {
            y: Math.PI * 2,
            duration: 20,
            repeat: -1,
            ease: "none"
        });
    }
}

function createOrbitRings() {
    const ringMat = new THREE.MeshStandardMaterial({
        color: HERO_CONFIG.colors.accent,
        emissive: HERO_CONFIG.colors.accent,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    
    const sizes = [1.8, 2.4, 3.2];
    sizes.forEach((radius, i) => {
        const ringGeo = new THREE.TorusGeometry(radius, 0.02, 16, 100);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 + (i * 0.2);
        ring.rotation.y = (i * 0.5);
        sceneGroup.add(ring);
        
        if (!prefersReducedMotion) {
            gsap.to(ring.rotation, {
                z: Math.PI * 2,
                duration: 15 + (i * 5),
                repeat: -1,
                ease: "none"
            });
        }
    });
}

function createBook(x, y, z, colorIndex) {
    const bookGroup = new THREE.Group();
    bookGroup.position.set(x, y, z);
    
    // Cover
    const coverGeo = new THREE.BoxGeometry(0.8, 1.1, 0.15);
    const coverMat = new THREE.MeshStandardMaterial({
        color: HERO_CONFIG.colors.books[colorIndex % 3],
        roughness: 0.4,
        metalness: 0.1
    });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    
    // Pages (slightly smaller, white)
    const pagesGeo = new THREE.BoxGeometry(0.75, 1.05, 0.16);
    const pagesMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.position.x = 0.03;
    
    bookGroup.add(cover, pages);
    sceneGroup.add(bookGroup);
    interactiveObjects.push(cover);
    
    // Initial random rotation
    bookGroup.rotation.set(Math.random(), Math.random(), Math.random());
    
    if (!prefersReducedMotion) {
        gsap.to(bookGroup.position, {
            y: y + 0.3,
            duration: 3 + Math.random(),
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        gsap.to(bookGroup.rotation, {
            x: "+=0.2",
            y: "+=0.5",
            z: "+=0.1",
            duration: 10 + Math.random() * 5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
}

function createAtom(x, y, z) {
    const atomGroup = new THREE.Group();
    atomGroup.position.set(x, y, z);
    
    const mat = new THREE.MeshStandardMaterial({
        color: HERO_CONFIG.colors.accent,
        emissive: HERO_CONFIG.colors.accent,
        emissiveIntensity: 0.5
    });
    
    // Nucleus
    const nucleusGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const nucleus = new THREE.Mesh(nucleusGeo, mat);
    atomGroup.add(nucleus);
    interactiveObjects.push(nucleus);
    
    // Orbits and electrons
    for(let i=0; i<3; i++) {
        const orbitGroup = new THREE.Group();
        
        const orbitGeo = new THREE.TorusGeometry(0.6, 0.015, 8, 64);
        const orbit = new THREE.Mesh(orbitGeo, mat);
        orbitGroup.add(orbit);
        
        const electronGeo = new THREE.SphereGeometry(0.06, 16, 16);
        const electron = new THREE.Mesh(electronGeo, mat);
        electron.position.x = 0.6; // On the orbit
        orbitGroup.add(electron);
        
        orbitGroup.rotation.y = (Math.PI / 1.5) * i;
        orbitGroup.rotation.x = Math.PI / 3;
        
        atomGroup.add(orbitGroup);
        
        if (!prefersReducedMotion) {
            gsap.to(orbitGroup.rotation, {
                z: Math.PI * 2,
                duration: 2 + i,
                repeat: -1,
                ease: "none"
            });
        }
    }
    
    sceneGroup.add(atomGroup);
    
    if (!prefersReducedMotion) {
        gsap.to(atomGroup.position, {
            y: y - 0.4,
            duration: 4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        gsap.to(atomGroup.rotation, {
            y: Math.PI * 2,
            x: Math.PI * 2,
            duration: 20,
            repeat: -1,
            ease: "none"
        });
    }
}

function createMolecule(x, y, z) {
    const molGroup = new THREE.Group();
    molGroup.position.set(x, y, z);
    
    const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.4,
        roughness: 0.2
    });
    
    const positions = [
        new THREE.Vector3(0, 0.4, 0),
        new THREE.Vector3(-0.4, -0.3, 0.3),
        new THREE.Vector3(0.4, -0.3, 0.3),
        new THREE.Vector3(0, -0.3, -0.5)
    ];
    
    const sphereGeo = new THREE.SphereGeometry(0.15, 16, 16);
    
    positions.forEach((pos, index) => {
        const sphere = new THREE.Mesh(sphereGeo, mat);
        sphere.position.copy(pos);
        molGroup.add(sphere);
        interactiveObjects.push(sphere);
        
        // Create connections to center (if not center)
        if (index > 0) {
            const distance = positions[0].distanceTo(pos);
            const cylGeo = new THREE.CylinderGeometry(0.03, 0.03, distance, 8);
            const cyl = new THREE.Mesh(cylGeo, mat);
            
            // Position cylinder exactly halfway
            cyl.position.copy(positions[0]).lerp(pos, 0.5);
            // Orient cylinder
            cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().sub(positions[0]).normalize());
            
            molGroup.add(cyl);
        }
    });
    
    sceneGroup.add(molGroup);
    
    if (!prefersReducedMotion) {
        gsap.to(molGroup.position, {
            y: y + 0.2,
            duration: 3.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        gsap.to(molGroup.rotation, {
            x: Math.PI * 2,
            y: Math.PI * 2,
            duration: 25,
            repeat: -1,
            ease: "none"
        });
    }
}

function createMathSymbol(char, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.font = 'bold 160px Arial';
    ctx.fillStyle = '#c4b5fd'; // Light purple
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 20;
    ctx.fillText(char, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.set(x, y, z);
    sprite.scale.set(1.5, 1.5, 1.5);
    
    sceneGroup.add(sprite);
    
    if (!prefersReducedMotion) {
        gsap.to(sprite.position, {
            y: y + (Math.random() * 0.5),
            x: x + (Math.random() * 0.3 - 0.15),
            duration: 4 + Math.random() * 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
}

function createGeometryObjects() {
    const mat = new THREE.MeshPhysicalMaterial({
        color: HERO_CONFIG.colors.glow,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        transmission: 0.8,
        wireframe: true
    });
    
    const geometries = [
        new THREE.IcosahedronGeometry(0.5, 0),
        new THREE.OctahedronGeometry(0.4, 0),
        new THREE.TorusGeometry(0.3, 0.1, 16, 32)
    ];
    
    const positions = [
        { x: -4, y: -2, z: 1 },
        { x: 4, y: 2, z: -2 },
        { x: 2, y: -3, z: 0 }
    ];
    
    geometries.forEach((geo, i) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(positions[i].x, positions[i].y, positions[i].z);
        sceneGroup.add(mesh);
        interactiveObjects.push(mesh);
        
        if (!prefersReducedMotion) {
            gsap.to(mesh.rotation, {
                x: Math.PI * 2,
                y: Math.PI * 2,
                duration: 15 + i * 5,
                repeat: -1,
                ease: "none"
            });
            gsap.to(mesh.position, {
                y: positions[i].y + 0.4,
                duration: 3 + i,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        }
    });
}

function createParticles() {
    const count = HERO_CONFIG.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    
    for(let i = 0; i < count * 3; i++) {
        // Spread particles across a wide volume
        positions[i] = (Math.random() - 0.5) * 15;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.05,
        color: HERO_CONFIG.colors.particles,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
    });
    
    const particles = new THREE.Points(geometry, material);
    sceneGroup.add(particles);
    
    if (!prefersReducedMotion) {
        gsap.to(particles.rotation, {
            y: Math.PI * 2,
            duration: 100,
            repeat: -1,
            ease: "none"
        });
    }
}

// ==========================================================================
// 6. ANIMATION TIMELINES
// ==========================================================================
function playIntroAnimation() {
    if (prefersReducedMotion) {
        sceneGroup.scale.set(1, 1, 1);
        sceneGroup.position.set(0, 0, 0);
        return;
    }

    // Set initial states
    sceneGroup.scale.set(0.1, 0.1, 0.1);
    sceneGroup.position.y = -2;
    sceneGroup.children.forEach(child => {
        if (child.material && child.material.opacity !== undefined) {
            child.userData.targetOpacity = child.material.opacity;
            child.material.opacity = 0;
        }
    });

    const introTl = gsap.timeline({
        defaults: { ease: "expo.out", duration: 2 }
    });

    // 1. Scene scales up
    introTl.to(sceneGroup.scale, { x: 1, y: 1, z: 1, duration: 2.5 })
           .to(sceneGroup.position, { y: 0, duration: 2.5 }, 0);
           
    // 2. Opacity fade in
    sceneGroup.children.forEach(child => {
        if (child.material && child.material.opacity !== undefined) {
            introTl.to(child.material, {
                opacity: child.userData.targetOpacity,
                duration: 1.5 + Math.random()
            }, 0.5);
        }
    });
}

// ==========================================================================
// 7. INTERACTIONS
// ==========================================================================
function setupHeroInteraction() {
    const canvas = renderer.domElement;
    
    // Mouse Parallax & Raycaster tracking
    window.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates for raycaster (-1 to +1)
        const rect = canvas.getBoundingClientRect();
        
        // Only track if mouse is within/near the canvas area to save performance
        if (event.clientY > rect.bottom) return; 

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Subtly rotate the entire scene based on mouse (Parallax)
        if (!prefersReducedMotion && !isMobile) {
            gsap.to(sceneGroup.rotation, {
                x: mouse.y * 0.1,
                y: mouse.x * 0.1,
                duration: 2,
                ease: "power2.out"
            });
        }
    });

    // Click interaction
    window.addEventListener('click', () => {
        if (hoveredObject) {
            const originalScale = hoveredObject.scale.x; // assuming uniform scale
            gsap.to(hoveredObject.scale, {
                x: originalScale * 1.2,
                y: originalScale * 1.2,
                z: originalScale * 1.2,
                duration: 0.3,
                yoyo: true,
                repeat: 1,
                ease: "back.out(2)"
            });
            
            if (hoveredObject.material && hoveredObject.material.emissiveIntensity !== undefined) {
                const origIntensity = hoveredObject.material.emissiveIntensity;
                gsap.to(hoveredObject.material, {
                    emissiveIntensity: origIntensity * 2,
                    duration: 0.3,
                    yoyo: true,
                    repeat: 1
                });
            }
        }
    });
}

function setupHeroScrollAnimation() {
    if (typeof ScrollTrigger === 'undefined' || prefersReducedMotion) return;

    // Connect scene rotation and camera push to scroll
    ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1,
        animation: gsap.timeline()
            .to(sceneGroup.position, { y: 2, ease: "none" }, 0)
            .to(sceneGroup.rotation, { y: Math.PI / 4, ease: "none" }, 0)
            .to(camera.position, { z: HERO_CONFIG.cameraZ + 3, ease: "none" }, 0)
    });
}

// ==========================================================================
// 8. RENDER LOOP
// ==========================================================================
function animateHero3D() {
    if (!renderer || !scene || !camera) return;

    // Raycaster for Hover states (Only on Desktop)
    if (!isMobile && !prefersReducedMotion) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects, false);

        if (intersects.length > 0) {
            if (hoveredObject !== intersects[0].object) {
                // Restore previous object
                if (hoveredObject && hoveredObject.userData.originalScale) {
                    gsap.to(hoveredObject.scale, {
                        x: hoveredObject.userData.originalScale.x,
                        y: hoveredObject.userData.originalScale.y,
                        z: hoveredObject.userData.originalScale.z,
                        duration: 0.3
                    });
                }
                
                hoveredObject = intersects[0].object;
                
                // Save original scale if not saved
                if (!hoveredObject.userData.originalScale) {
                    hoveredObject.userData.originalScale = hoveredObject.scale.clone();
                }
                
                // Apply hover effect
                gsap.to(hoveredObject.scale, {
                    x: hoveredObject.userData.originalScale.x * 1.1,
                    y: hoveredObject.userData.originalScale.y * 1.1,
                    z: hoveredObject.userData.originalScale.z * 1.1,
                    duration: 0.3,
                    ease: "power2.out"
                });
                document.body.style.cursor = 'pointer';
            }
        } else {
            if (hoveredObject) {
                // Restore object
                gsap.to(hoveredObject.scale, {
                    x: hoveredObject.userData.originalScale.x,
                    y: hoveredObject.userData.originalScale.y,
                    z: hoveredObject.userData.originalScale.z,
                    duration: 0.3
                });
                hoveredObject = null;
                document.body.style.cursor = 'default';
            }
        }
    }

    renderer.render(scene, camera);
}

// ==========================================================================
// 9. RESIZE HANDLING
// ==========================================================================
function handleHeroResize() {
    const canvas = renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initHero3D);
