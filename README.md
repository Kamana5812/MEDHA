# MEDHA — Where Intelligence Comes Alive

MEDHA is an interactive educational web experience that combines modern web design, GSAP animation, Three.js 3D visualization, and real-time Cannon-es physics to create an immersive learning environment.

## Project Overview

MEDHA is a premium EdTech platform conceptualized for learners who excel through exploration. Instead of static grids of information, MEDHA transforms abstract concepts into tangible realities by inviting users to touch, drag, throw, and interact with the physical laws of nature directly in their browser. 

## Objective

This project aims to demonstrate advanced frontend architecture, specifically highlighting:
- Interactive education design
- Modern frontend development without heavy frameworks
- Cinematic GSAP animations
- 3D visualization (WebGL)
- Real physics interaction in the browser
- Robust cross-device responsive design

## Industry

**Educational Technology / EdTech**

MEDHA represents the evolution of digital learning spaces, moving beyond text-based consumption into tactile, exploratory, and highly engaging digital realities.

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript ES6+

### Animation
- GSAP
- GSAP ScrollTrigger

### 3D
- Three.js

### Physics
- Cannon-es

### Interaction
- Three.js Raycaster
- Pointer Events (`pointerdown`, `pointermove`, `pointerup`)

## Features

- **Responsive Navigation**: Glassmorphism navbar with active scroll-state detection.
- **Mobile Menu**: Custom accessible hamburger navigation with body scroll-locking.
- **Animated Hero Entrance**: Cinematic GSAP master timeline sequencing the page load.
- **Interactive Three.js Hero**: Procedural educational universe containing an intelligence core, orbital rings, books, molecules, atoms, and mathematical symbols.
- **GSAP Animations**: Text reveals, staggered cards, and collision visual feedback.
- **ScrollTrigger Animations**: Scroll-linked 3D camera transitions and depth parallax.
- **Interactive Physics Playground**: A complete 3D environment where objects physically react to user input.
- **Gravity Simulation**: Objects fall and settle based on dynamic directional physics.
- **Collision Detection**: Real-time rigid body impacts with boundaries and other objects.
- **Drag and Throw**: Kinematic pointer tracking allowing users to grab, move, and throw objects.
- **Momentum**: Delta-time pointer tracking calculates precise physical release velocity.
- **Object Spawning**: UI button to create new physical geometries dynamically.
- **Gravity Direction Switching**: Toggle physics gravity (Down, Up, Left, Right).
- **Object Color Randomization**: Procedurally shifts object material hex colors.
- **Scene Reset**: Safely disposes and recreates the physics playground.
- **Collision Visual Effects**: Hard impacts trigger procedural GSAP scale/emission pulses.
- **Testimonials**: Interactive looping carousel.
- **Program Filtering**: Vanilla JS categorization sorting (All, Science, Math, Technology, Creative).
- **Contact Form Validation**: Real-time UI validation logic with a visual success state.
- **Responsive Layout**: CSS Grid, Flexbox, and fluid typography.
- **Reduced-Motion Support**: Automatic detection to pause infinite 3D animations for accessibility.

## 3D Hero

Three.js renders a procedural educational universe directly in the DOM.
The scene includes meticulously constructed conceptual objects:
- Intelligence core (Emissive glowing orb surrounded by glass)
- Orbit rings
- Books
- Atom (Nucleus with electron orbits)
- Molecule (Cylinder-linked spheres)
- Mathematical symbols (π, Σ, ∞)
- Geometric objects (Icosahedron, Octahedron, Torus)
- Ambient particles

Three.js handles the raw WebGL rendering, while GSAP controls cinematic movement and presentation. Mouse interaction creates subtle rotational parallax, and the Three.js Raycaster detects hover interactions for visual feedback.

## Interactive Physics Playground

The physics playground cleanly separates simulation from presentation.

**Architecture:**
Three.js handles visual rendering, Cannon-es dictates the physics simulation, the Raycaster handles object selection, and GSAP provides UI visual feedback.

In the `animatePhysicsLoop()`, the positions and quaternions calculated by the Cannon-es physics bodies are explicitly synchronized to their corresponding Three.js meshes every frame.

### Physics Architecture Flow
```text
User Interaction
↓
Raycaster
↓
Selected Three.js Object
↓
Corresponding Cannon-es Body
↓
Physics Simulation
↓
Position + Quaternion Synchronization
↓
Three.js Renderer
```

### Physics Features

- **Gravity**: Objects fall under the Cannon-es gravity simulation, reacting to mass.
- **Collisions**: Physics bodies collide with the floor, invisible bounding walls, and each other.
- **Bounce**: Restitution parameters control physical bounce behavior upon impact.
- **Dragging**: Users can select and move interactive objects along a fixed 2D plane based on pointer depth.
- **Throwing**: Pointer movement over time (`dt`) is used to determine physical release velocity.
- **Momentum**: Thrown objects continue moving across the scene according to their physics velocity.
- **Gravity Direction**: Users can change the direction of the physics world's gravity.
- **Collision Effects**: Hard collision events (calculated via `getImpactVelocityAlongNormal()`) trigger GSAP visual feedback.

### Interactive Controls

| Control | Function |
|---|---|
| **Spawn Object** | Adds a new physics object with randomized geometry |
| **Change Gravity** | Cycles the world gravity direction (Down, Up, Left, Right) |
| **Randomize Colors** | Changes existing object colors dynamically |
| **Reset Universe** | Safely recreates the initial scene state and objects |

## GSAP Animations

Cannon-es strictly controls physical movement, while GSAP is used exclusively for presentation and visual feedback. 
GSAP powers:
- The staggered Hero entrance animation
- Staggered card reveals in the About, Programs, Mentors, and Events sections
- Scroll-linked camera push and scene rotations utilizing `ScrollTrigger`
- Procedural scale and emission pulses triggered by physics collisions

## Responsive Design

MEDHA fully supports Desktop, Tablet, and Mobile devices.
Key optimizations include:
- Reduced background particle count on mobile (from 250 to 80).
- Capped device pixel ratios (1.5x on mobile vs 2.0x on desktop) to preserve battery and framerate.
- Responsive canvas sizing recalculating camera aspects dynamically on window resize.
- Touch support explicitly overriding browser pan-actions during physics interaction (`touch-action: none`).
- Single-column layout collapsing to prevent horizontal overflow on smaller screens.

## Accessibility

- Semantic HTML5 structure.
- Accessible keyboard navigation (Tab, Arrow keys, Enter, Escape).
- Form inputs utilizing proper labels and ARIA error states.
- Visible focus states on interactive components.
- Reduced-motion support (`prefers-reduced-motion: reduce`) disables continuous 3D rotations and cinematic sweeps while maintaining core functionality.

## Performance Considerations

- **Capped Device Pixel Ratio**: Prevents extreme rendering costs on high-density displays.
- **Limited 3D Object Count**: The playground strictly limits objects to 25.
- **Object Disposal**: Reaching the spawn limit intelligently shifts the oldest object out, explicitly calling `.dispose()` on its geometry and material to prevent memory leaks.
- **Optimized Physics Shapes**: Complex geometries (like Icosahedrons) are approximated with Cannon-es `Sphere()` bounds to save solver iterations.
- **Efficient Raycasting**: The Hero raycaster is completely bypassed on Mobile devices since hover states do not exist natively on touch screens.

## WebGL Fallback

If WebGL is unavailable on the device, the `<canvas>` nodes contain inner fallback text indicating that the interactive 3D experience is unavailable, while the remainder of the semantic website layout remains accessible and functional.

## Project Structure

```text
MEDHA/
│
├── index.html
├── README.md
├── script.js
│
├── css/
│   └── style.css
│
├── js/
│   ├── hero3d.js
│   └── physics.js
│
└── screenshots/
```

## Getting Started

To run this project locally, you must serve it over a local development server to bypass browser CORS restrictions relating to ES modules and file loading.

1. Clone the repository to your local machine.
2. Open the project directory.
3. Start a local server (e.g., using VS Code Live Server, Python HTTP server, or Node `http-server`).
   
Using Node.js:
```bash
npx http-server .
```
4. Open the provided localhost URL in your browser.

## Browser Support

The project targets modern browsers capable of supporting:
- ES6+ JavaScript
- WebGL
- HTML5 Canvas
- Pointer Events API

## Screenshots

Screenshots of the completed project should be placed within the `/screenshots/` directory.

*Suggested placements:*
- `screenshots/hero.png`
- `screenshots/about.png`
- `screenshots/programs.png`
- `screenshots/playground.png`
- `screenshots/physics-interaction.png`
- `screenshots/mobile.png`

## Learning Outcomes

This project serves as a comprehensive demonstration of:
- Advanced DOM manipulation
- Responsive CSS architecture (Grid, Flexbox, Custom Properties)
- Modular Vanilla JavaScript architecture
- GSAP Timeline sequencing and ScrollTrigger implementation
- Three.js WebGL rendering concepts (Lighting, Materials, Procedural Geometry)
- Real-time physics simulation (Cannon-es)
- Complex 3D raycasting and pointer interaction mapping
- Frontend performance optimization and memory management

## Challenges & Solutions

**Synchronizing Physics and Rendering**
Cannon-es calculates physics math while Three.js renders the visual scene. They do not naturally communicate.
*Solution*: A dedicated render loop dynamically copies the `.position` and `.quaternion` values from every Cannon-es body to its corresponding Three.js mesh at 60fps.

**Drag and Throw Architecture**
Pointer movement across a 2D screen needs to be translated into a 3D interaction and a physical release velocity.
*Solution*: The Raycaster identifies the selected object, converts it to a `KINEMATIC` body, tracks its drag intersection across an invisible `THREE.Plane`, and utilizes delta-time (`dt`) calculation upon pointer release to apply a clamped throwing velocity before returning it to a `DYNAMIC` physical state.

**Performance and Stability**
3D scenes and physics simulations require hard object limits and optimized rendering. If a browser tab slows down, standard physics loops can "explode" objects through the floor (tunneling).
*Solution*: Implementation of an adaptive delta-time accumulator inside the Cannon-es solver, alongside increased solver iterations, bounding box simplification, and strict disposal garbage collection limits.

## Live Demo

[LIVE_DEMO_URL]

## Repository

[GITHUB_REPOSITORY_URL]

## Developer

**Developer**: [Your Name]

## Acknowledgements

- **Three.js**: WebGL 3D rendering engine.
- **Cannon-es**: Rigid-body physics engine.
- **GSAP**: Professional-grade animation library.

## License

License information can be added according to the project's intended distribution.
