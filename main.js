// Import the AsciiEffect module from Three.js examples.
import { AsciiEffect } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/effects/AsciiEffect.js';

/* 
  Main script for the 3D wooden roller coaster ride.
  Enhancements:
    - Detailed roller coaster geometry with wooden aesthetics.
    - Wooden track, ties, and supports replacing the previous metal design.
    - Physics-based simulation using energy conservation with potential and kinetic energy.
    - The coaster now pulls up hills faster thanks to an increased chain lift power.
    - The first hill has been made significantly taller to build up enough energy.
    - An enhanced, colorized ASCII shader is applied to the entire scene.
    - A dynamic sun cycle animates the directional light and a visible sun mesh.
*/

// Helper function to get the next value mod 1 (kept for fallback if needed)
function mod1(value) {
  return value - Math.floor(value);
}

// Initialize scene, camera, and renderer.
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // light blue sky

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Create the ASCII effect based on the renderer with color enabled.
const asciiEffect = new AsciiEffect(renderer, ' .:-+*=%@#', { invert: true, color: true });
asciiEffect.setSize(container.clientWidth, container.clientHeight);
asciiEffect.domElement.style.backgroundColor = 'black';
// Remove the original canvas if any, then append the ASCII effect DOM element.
container.innerHTML = '';
container.appendChild(asciiEffect.domElement);

// Set up camera: the camera will follow the coaster car with a vertical offset.
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
const cameraYOffset = 2; // Raise the camera a bit above the track

// Add ambient light which will be adjusted during the sun cycle.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Add directional light to simulate the sun.
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

// Create a visible sun sphere to enhance the scene.
const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

// Create the roller coaster track curve using CatmullRomCurve3 with custom control points.
// The first hill's height has been significantly increased for more energy.
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 40, -5),    // First hill increased (y: 40)
  new THREE.Vector3(20, 0, -10),
  new THREE.Vector3(30, -5, 0),
  new THREE.Vector3(40, 0, 10),
  new THREE.Vector3(30, 5, 20),
  new THREE.Vector3(20, 10, 10),
  new THREE.Vector3(10, 5, 0),
  new THREE.Vector3(5, 2.5, 0),   // Intermediate point for smoother transition
  new THREE.Vector3(0, 0, 0)        // Closing loop
];
// Use 'centripetal' curve type to smooth out abrupt turns.
const trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

// Create the tube geometry for the roller coaster track with high detail.
const tubularSegments = 400;  // Increased for more detail
const trackRadius = 0.5;
const radialSegments = 16;
const closed = true;
const tubeGeometry = new THREE.TubeGeometry(trackCurve, tubularSegments, trackRadius, radialSegments, closed);

// Wood-like material for the track
const trackMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B4513, // Saddle brown for wood
  roughness: 0.9,
  metalness: 0.0 
});
const trackMesh = new THREE.Mesh(tubeGeometry, trackMaterial);
scene.add(trackMesh);

/*
  Add wooden ties along the track.
  These simulate the cross wooden planks (ties) that support the track structure.
*/
function addTie(tVal) {
  // Get current position and tangent from the track curve.
  const pos = trackCurve.getPointAt(tVal);
  const tangent = trackCurve.getTangentAt(tVal).normalize();

  // Compute a side vector perpendicular to the tangent using the global up vector.
  const up = new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(up, tangent);
  // Fallback if tangent is near vertical.
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();

  // Dimensions for the tie: long along the side, narrow in depth, and thin vertically.
  const tieWidth = trackRadius * 5;
  const tieHeight = 0.15;
  const tieDepth = 0.05;
  const geometry = new THREE.BoxGeometry(tieWidth, tieHeight, tieDepth);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.0 
  });
  const tieMesh = new THREE.Mesh(geometry, material);

  // Position the tie centered on the track, with a slight downward offset.
  tieMesh.position.copy(pos);
  tieMesh.position.y -= trackRadius * 0.8;

  // Orient the tie so its long axis aligns with the side vector.
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(side, up, tangent);
  tieMesh.setRotationFromMatrix(matrix);

  scene.add(tieMesh);
}

// Add ties along the track every 0.05 in t
for (let tVal = 0; tVal < 1; tVal += 0.05) {
  addTie(tVal);
}

/*
  Add wooden supports beneath the track.
  Create twin wooden posts on each side of the track.
*/
function addSupport(tVal) {
  const pos = trackCurve.getPointAt(tVal);
  const tangent = trackCurve.getTangentAt(tVal).normalize();

  const up = new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(up, tangent);
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();

  const groundLevel = -5;
  const supportHeight = pos.y - groundLevel;
  if (supportHeight <= 0.5) return; // Skip supports if nearly at ground

  const postWidth = 0.2;
  const postDepth = 0.2;
  const geometry = new THREE.BoxGeometry(postWidth, supportHeight, postDepth);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.0 
  });

  // Left support post
  const leftPost = new THREE.Mesh(geometry, material);
  leftPost.position.copy(pos).add(side.clone().multiplyScalar(trackRadius + postWidth));
  leftPost.position.y = (pos.y + groundLevel) / 2;
  scene.add(leftPost);

  // Right support post
  const rightPost = new THREE.Mesh(geometry, material);
  rightPost.position.copy(pos).add(side.clone().multiplyScalar(- (trackRadius + postWidth)));
  rightPost.position.y = (pos.y + groundLevel) / 2;
  scene.add(rightPost);
}

// Add supports along the track at intervals (every 20 segments)
for (let i = 0; i < tubularSegments; i += 20) {
  const tSample = i / tubularSegments;
  addSupport(tSample);
}

// Add a simple ground plane for context.
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = - Math.PI / 2;
groundMesh.position.y = -5;
scene.add(groundMesh);

/*
  Physics-based simulation for the coaster along the track.
  Uses conservation of energy, considering:
    - Gravitational potential energy: E_p = m*g*h   (with m assumed as 1 for simplicity)
    - Kinetic energy: E_k = 0.5*v²
    - Frictional losses proportional to v²
    - Extra energy input from the chain lift during the ascending portion.
*/

// Constants and initial conditions.
const clock = new THREE.Clock();
const g = 9.81;             // Gravitational acceleration (m/s²)
let s = 0;                  // Arc length traveled along the track (in meters)
let v = 2;                  // Initial velocity in m/s along the track.
const initialPos = trackCurve.getPointAt(0);
let E = 0.5 * v * v + g * initialPos.y;  // Total mechanical energy.

// Simulation parameters for friction and chain lift.
const friction = 0.5;           // Friction coefficient (energy loss factor)
const chainLiftThreshold = 0.2; // Normalized track position where the chain lift is active
const chainLiftPower = 15;      // Extra energy input per second in the chain lift zone (J/s)

// Parameters for the sun cycle.
const sunCycleDuration = 60;  // Duration of a full sun cycle in seconds.

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // ---------------- Sun Cycle Update ----------------
  // Calculate the sun angle based on elapsed time.
  const elapsed = clock.getElapsedTime();
  const sunAngle = (elapsed % sunCycleDuration) / sunCycleDuration * 2 * Math.PI;
  // Position the sun in a circular path: rising from the horizon to zenith and down.
  const sunDistance = 30;
  const sunX = Math.cos(sunAngle) * sunDistance;
  // Use sine for the vertical position with an offset so the sun never goes completely below.
  const sunY = Math.max(Math.sin(sunAngle) * sunDistance, 0) + 10;
  const sunZ = -10;
  directionalLight.position.set(sunX, sunY, sunZ);
  sunMesh.position.set(sunX, sunY, sunZ);

  // Adjust ambient light intensity based on sun height.
  ambientLight.intensity = 0.3 + 0.7 * (sunY / (sunDistance + 10));
  directionalLight.intensity = 0.5 + 0.5 * (sunY / (sunDistance + 10));

  // ---------------- Coaster Physics Update ----------------
  // Determine normalized parameter based on current arc-length along the track.
  let tParam = mod1(s / trackCurve.getLength());
  const pos = trackCurve.getPointAt(tParam);
  const currentHeight = pos.y;

  // Calculate frictional energy loss (proportional to v²).
  const frictionLoss = friction * (v * v) * deltaTime;

  // Add energy input for chain lift when in the designated zone.
  let chainLiftEnergy = 0;
  if (tParam < chainLiftThreshold) {
    chainLiftEnergy = chainLiftPower * deltaTime;
  }

  // Update total mechanical energy.
  E += chainLiftEnergy - frictionLoss;

  // Compute new kinetic energy (ensuring it does not go negative).
  let kineticEnergy = E - g * currentHeight;
  if (kineticEnergy < 0) kineticEnergy = 0;

  // Update velocity from kinetic energy.
  v = Math.sqrt(2 * kineticEnergy);

  // Update arc length along the track based on current speed.
  s += v * deltaTime;
  s = s % trackCurve.getLength();

  // Update the normalized parameter after moving.
  tParam = mod1(s / trackCurve.getLength());

  // Set camera position based on current coaster position.
  const baseCameraPos = trackCurve.getPointAt(tParam);
  camera.position.set(
    baseCameraPos.x,
    baseCameraPos.y + cameraYOffset,
    baseCameraPos.z
  );

  // Look ahead along the track for an optimal view direction.
  const lookAheadS = s + 2; // look ahead 2 meters
  const lookAheadT = mod1(lookAheadS / trackCurve.getLength());
  const lookAtPoint = trackCurve.getPointAt(lookAheadT);
  camera.lookAt(new THREE.Vector3(lookAtPoint.x, lookAtPoint.y + cameraYOffset, lookAtPoint.z));

  // Optional: add a slight banking effect based on the track's tangent.
  const tangent = trackCurve.getTangentAt(tParam).normalize();
  const axis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize();
  const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(tangent));
  camera.up.copy(new THREE.Vector3(0, 1, 0)).applyAxisAngle(axis, angle * 0.2);

  // Render using the enhanced, colorized ASCII effect.
  asciiEffect.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  asciiEffect.setSize(container.clientWidth, container.clientHeight);
}

// Start the energy-based physics simulation animation loop.
animate();