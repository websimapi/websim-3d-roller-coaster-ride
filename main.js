/* 
  Main script for the 3D wooden roller coaster ride.
  Enhancements:
    - Detailed roller coaster geometry with wooden aesthetics.
    - Wooden track, ties, and supports replacing the previous metal design.
    - Physics-based simulation using energy conservation with potential and kinetic energy.
    - The coaster now pulls up hills faster thanks to an increased chain lift power.
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
container.appendChild(renderer.domElement);

// Set up camera: the camera will follow the coaster car with a vertical offset.
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
const cameraYOffset = 2; // Raise the camera so that it is a bit above the track

// Add ambient light and directional light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

// Create the roller coaster track curve using CatmullRomCurve3 with custom control points
// Updated control points array with a higher first hill.
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 12, -5),    // Raised first hill for higher elevation
  new THREE.Vector3(20, 0, -10),
  new THREE.Vector3(30, -5, 0),
  new THREE.Vector3(40, 0, 10),
  new THREE.Vector3(30, 5, 20),
  new THREE.Vector3(20, 10, 10),
  new THREE.Vector3(10, 5, 0),
  new THREE.Vector3(5, 2.5, 0),   // New intermediate point for smoother transition
  new THREE.Vector3(0, 0, 0)        // closing loop
];
// Use 'centripetal' curve type to smooth out abrupt turns.
const trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

// Create the tube geometry for the roller coaster track with high detail.
const tubularSegments = 400;  // increased for more detail
const trackRadius = 0.5;
const radialSegments = 16;
const closed = true;
const tubeGeometry = new THREE.TubeGeometry(trackCurve, tubularSegments, trackRadius, radialSegments, closed);

// Wood-like material for the track
const trackMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B4513, // saddle brown color for wood
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
  // Get current position and tangent from the track curve
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
  We create twin wooden posts on each side of the track.
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

// Add a simple ground plane for context
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // forest green
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = - Math.PI / 2;
groundMesh.position.y = -5;
scene.add(groundMesh);

/*
  Physics-based simulation for the coaster along the track.
  This version uses conservation of energy, with separate calculations for potential
  and kinetic energy. We update the coaster's total mechanical energy by accounting for:
    - Gravitational potential energy: E_p = m*g*h   (with m assumed as 1 for simplicity)
    - Kinetic energy: E_k = 0.5*v²
    - Frictional losses, proportional to the square of the speed.
    - Extra energy input from the chain lift during the early ascending portion.
  
  With this method, hills are pulled up faster: when in the chain lift zone, extra energy is added.
*/

// Constants and initial conditions
const clock = new THREE.Clock();
const g = 9.81;             // gravitational acceleration (m/s²)
let s = 0;                  // arc length traveled along the track (in meters)
let v = 2;                  // initial velocity in m/s along the track

// Energy based simulation: E = kinetic + potential
// With mass m = 1, kinetic energy = 0.5 * v² and potential energy = g * h.
const initialPos = trackCurve.getPointAt(0);
let E = 0.5 * v * v + g * initialPos.y;

// Simulation parameters for friction and chain lift
const friction = 0.5;       // friction coefficient (energy loss factor)
const chainLiftThreshold = 0.2; // normalized track position where the chain lift is active
const chainLiftPower = 15;      // extra energy input per second in the chain lift zone (J/s)

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // Determine normalized parameter based on current arc-length along the track.
  let tParam = mod1(s / trackCurve.getLength());
  const pos = trackCurve.getPointAt(tParam);
  const currentHeight = pos.y;

  // Calculate frictional energy loss. (Simple model: loss proportional to v^2.)
  const frictionLoss = friction * (v * v) * deltaTime;

  // Add energy input for chain lift when in the designated zone.
  let chainLiftEnergy = 0;
  if (tParam < chainLiftThreshold) {
    chainLiftEnergy = chainLiftPower * deltaTime;
  }

  // Update total mechanical energy.
  E += chainLiftEnergy - frictionLoss;

  // Compute new kinetic energy (ensure it does not go negative).
  let kineticEnergy = E - g * currentHeight;
  if (kineticEnergy < 0) kineticEnergy = 0;

  // Update velocity from kinetic energy: v = sqrt(2 * kineticEnergy)
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

  renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Start the energy-based physics simulation animation loop.
animate();