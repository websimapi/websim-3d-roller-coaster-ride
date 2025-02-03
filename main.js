/* 
  Main script for a physics based wooden roller coaster ride.
  Features:
   - A roller coaster track built using a CatmullRomCurve3. The track is designed with gentle curves (no super sharp turns).
   - A chain lift on the early portion of the track (chain segment) that steadily pulls the coaster car to the top.
   - A physics simulation that uses a 1D integration along the track: when on chain lift, a constant speed is enforced; afterwards, gravity and friction take over.
   - A visible chain for the chain lift segment, with animated chain links moving along the chain.
   - A coaster car mesh that the camera follows. The camera is mounted with an upward offset so as not to cull the track.
*/

// Helper: modulo 1 function for our normalized parameter
function mod1(value) {
  return value - Math.floor(value);
}

// Get container and initialize scene
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

// Renderer initialization
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Camera: Perspective camera, later attached to the coaster car position
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
const cameraYOffset = 2;  // raise the camera relative to the coaster car

// Lights in the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

// Create the roller coaster track using CatmullRomCurve3 with selected control points.
// The control points have been chosen to minimize super-sharp turns.
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 5, -5),
  new THREE.Vector3(20, 6, -10),
  new THREE.Vector3(30, 5, 0),
  new THREE.Vector3(40, 6, 10),
  new THREE.Vector3(30, 5, 20),
  new THREE.Vector3(20, 6, 10),
  new THREE.Vector3(10, 5, 0),
  new THREE.Vector3(0, 0, 0) // closing the loop
];
const trackCurve = new THREE.CatmullRomCurve3(points, true);

// Tube geometry for the track
const tubularSegments = 400;
const trackRadius = 0.5;
const radialSegments = 16;
const closed = true;
const tubeGeometry = new THREE.TubeGeometry(trackCurve, tubularSegments, trackRadius, radialSegments, closed);

// Wood-like material for the roller coaster track
const trackMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x8B4513,  // saddle brown
  roughness: 0.9,
  metalness: 0.0 
});
const trackMesh = new THREE.Mesh(tubeGeometry, trackMaterial);
scene.add(trackMesh);

/*
  Add wooden ties along the track to simulate cross planks.
  These ties are added at interval along the track.
*/
function addTie(tVal) {
  const pos = trackCurve.getPointAt(tVal);
  const tangent = trackCurve.getTangentAt(tVal).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(up, tangent);
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();
  const tieWidth = trackRadius * 5;
  const tieHeight = 0.15;
  const tieDepth = 0.05;
  const geometry = new THREE.BoxGeometry(tieWidth, tieHeight, tieDepth);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
  const tieMesh = new THREE.Mesh(geometry, material);
  tieMesh.position.copy(pos);
  tieMesh.position.y -= trackRadius * 0.8;
  // Align tie's long axis with the side vector.
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(side, up, tangent);
  tieMesh.setRotationFromMatrix(matrix);
  scene.add(tieMesh);
}
for (let tVal = 0; tVal < 1; tVal += 0.05) {
  addTie(tVal);
}

/*
  Add wooden supports beneath the track.
  These supports are placed intermittently along the track to simulate twin wooden posts.
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
  if (supportHeight <= 0.5) return;
  const postWidth = 0.2;
  const postDepth = 0.2;
  const geometry = new THREE.BoxGeometry(postWidth, supportHeight, postDepth);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
  const leftPost = new THREE.Mesh(geometry, material);
  leftPost.position.copy(pos).add(side.clone().multiplyScalar(trackRadius + postWidth));
  leftPost.position.y = (pos.y + groundLevel) / 2;
  scene.add(leftPost);
  const rightPost = new THREE.Mesh(geometry, material);
  rightPost.position.copy(pos).add(side.clone().multiplyScalar(- (trackRadius + postWidth)));
  rightPost.position.y = (pos.y + groundLevel) / 2;
  scene.add(rightPost);
}
for (let i = 0; i < tubularSegments; i += 20) {
  const tSample = i / tubularSegments;
  addSupport(tSample);
}

// Add a ground plane for context
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // forest green
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = - Math.PI / 2;
groundMesh.position.y = -5;
scene.add(groundMesh);

/*
  Physics simulation of coaster motion along the track.
  We simulate a 1D motion along the track parameter t.
  For t values in the chain lift segment, the coaster car is pulled upward at a constant speed.
  For the remainder of the track, gravity (projected along the track tangent) and friction govern the motion.
*/

// Constants for physics simulation
const chainEnd = 0.2;     // Chain lift covers t from 0 to 0.2
const chainSpeed = 2;     // Constant speed (units per second along track, in chain segment)
const frictionCoefficient = 0.5;  // A basic friction term (m/s^2)
const gravityAcc = 9.81;  // gravitational acceleration (m/s^2)
// Simulation state variables
let tPosition = 0;   // current position along track (normalized 0..1)
let velocity = 0;    // scalar velocity along the track (m/s)
let simulationTime = 0;
const clock = new THREE.Clock();

// Create a coaster car mesh that the camera will follow.
const carGeometry = new THREE.BoxGeometry(1, 0.5, 2);
const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const coasterCar = new THREE.Mesh(carGeometry, carMaterial);
scene.add(coasterCar);

// Create a chain group for the chain lift region.
const chainGroup = new THREE.Group();
scene.add(chainGroup);
const chainLinkCount = 20;
const chainLinks = [];
const chainLinkGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
const chainLinkMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
for (let i = 0; i < chainLinkCount; i++) {
  const link = new THREE.Mesh(chainLinkGeometry, chainLinkMaterial);
  chainGroup.add(link);
  chainLinks.push(link);
}

/*
  updateChainLinks animates the visible chain in the chain lift segment.
  Each link is arranged along the portion of the track [0, chainEnd].
  The links are animated to simulate the chain moving upward.
*/
function updateChainLinks(offset) {
  for (let i = 0; i < chainLinkCount; i++) {
    // Calculate chain parameter for each link; cycle through [0, chainEnd]
    let linkT = mod1(offset + i * (chainEnd / chainLinkCount));
    // Get position and tangent from track curve
    const pos = trackCurve.getPointAt(linkT);
    const tangent = trackCurve.getTangentAt(linkT).normalize();
    // Determine a side vector for orientation
    let up = new THREE.Vector3(0, 1, 0);
    let side = new THREE.Vector3().crossVectors(up, tangent);
    if (side.lengthSq() < 0.0001) {
      side = new THREE.Vector3(1, 0, 0);
    }
    side.normalize();
    // Compute orientation so that the link aligns with the track
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(side, up, tangent);
    chainLinks[i].setRotationFromMatrix(matrix);
    chainLinks[i].position.copy(pos);
    // Optionally, add a rotation on the link itself to simulate chain rolling
    chainLinks[i].rotation.z += offset; 
  }
}

// Animation loop updates the physics simulation and rendering.
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  simulationTime += dt;

  // Update physics along the track:
  // If within chain lift segment, enforce constant speed.
  if (tPosition < chainEnd) {
    velocity = chainSpeed;
  } else {
    // Get track tangent at current position.
    const tangent = trackCurve.getTangentAt(tPosition).normalize();
    // Project gravity onto the tangent. Gravity is (0,-gravityAcc,0)
    const gravityVec = new THREE.Vector3(0, -gravityAcc, 0);
    const a_gravity = gravityVec.dot(tangent);
    // Friction always opposes motion.
    const friction = -frictionCoefficient * Math.sign(velocity);
    const acceleration = a_gravity + friction;
    velocity += acceleration * dt;
  }
  // Update position along the track.
  tPosition = mod1(tPosition + velocity * dt);

  // Update the coaster car position and orientation.
  const carPos = trackCurve.getPointAt(tPosition);
  coasterCar.position.copy(carPos);
  // Determine orientation: Look ahead along the track.
  const lookAheadT = mod1(tPosition + 0.01);
  const lookAtPoint = trackCurve.getPointAt(lookAheadT);
  // account for vertical camera offset in orientation calculation
  coasterCar.lookAt(new THREE.Vector3(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z));
  
  // Update camera to follow the car with an upward offset.
  camera.position.set(carPos.x, carPos.y + cameraYOffset, carPos.z);
  camera.lookAt(coasterCar.position);

  // Update the chain animation offset. The chain's offset is based on the simulation time and chainSpeed.
  // We assume the chain moves continuously along the chain segment.
  const chainOffset = mod1(chainSpeed * simulationTime / chainEnd);
  updateChainLinks(chainOffset);

  renderer.render(scene, camera);
}

// Responsive behavior
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener('resize', onWindowResize, false);

// Start the animation loop.
animate();