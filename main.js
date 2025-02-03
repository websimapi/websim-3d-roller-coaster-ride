/* 
  Main script for the 3D wooden roller coaster ride.
  Enhancements in this version:
    - Redesigned track with no sharp turns and a long, high first hill.
    - Added a chain-lift mechanism on the first hill to raise the coaster faster.
    - Detailed wooden roller coaster track with siding, ties, and supports.
    - Physics-based simulation for the coaster along the track.
*/

// Helper function to get the next value mod 1
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

/*
  Redesign the track: no sharp turns, with the first hill as the longest and highest section.
  The first segment acts as the chain lift.
*/
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 25, 0),      // Start of long high chain lift hill
  new THREE.Vector3(25, 25, 0),      // Extended plateau for chain lift effect
  new THREE.Vector3(40, 20, -10),
  new THREE.Vector3(55, 15, -5),
  new THREE.Vector3(70, 10, 10),
  new THREE.Vector3(80, 8, 15),
  new THREE.Vector3(90, 10, 5),
  new THREE.Vector3(95, 0, -10),
  new THREE.Vector3(0, 0, 0)         // Closing loop
];

// Use 'centripetal' curve type to naturally smooth out the turns.
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
  const material = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.0 
  });
  const tieMesh = new THREE.Mesh(geometry, material);

  tieMesh.position.copy(pos);
  tieMesh.position.y -= trackRadius * 0.8;

  const matrix = new THREE.Matrix4();
  matrix.makeBasis(side, up, tangent);
  tieMesh.setRotationFromMatrix(matrix);

  scene.add(tieMesh);
}

// Add ties along the track every 0.05 in t.
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
  if (supportHeight <= 0.5) return;

  const postWidth = 0.2;
  const postDepth = 0.2;
  const geometry = new THREE.BoxGeometry(postWidth, supportHeight, postDepth);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.0 
  });

  const leftPost = new THREE.Mesh(geometry, material);
  leftPost.position.copy(pos).add(side.clone().multiplyScalar(trackRadius + postWidth));
  leftPost.position.y = (pos.y + groundLevel) / 2;
  scene.add(leftPost);

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

/*
  Add siding along the track to evoke an old-school wooden roller coaster aesthetic.
  Siding boards run along both sides of the track, attached at regular intervals.
*/
function addSiding(tVal) {
  const pos = trackCurve.getPointAt(tVal);
  const tangent = trackCurve.getTangentAt(tVal).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  
  let side = new THREE.Vector3().crossVectors(up, tangent);
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();

  const sidingWidth = 2.5;
  const sidingHeight = 0.1;
  const sidingDepth = 0.05;
  const geometry = new THREE.BoxGeometry(sidingWidth, sidingHeight, sidingDepth);
  const material = new THREE.MeshStandardMaterial({
    color: 0xA0522D, // sienna for a slightly different wood tone
    roughness: 0.95,
    metalness: 0.0
  });
  
  const leftBoard = new THREE.Mesh(geometry, material);
  leftBoard.position.copy(pos).add(side.clone().multiplyScalar(trackRadius + sidingDepth));
  leftBoard.position.y += trackRadius;
  leftBoard.lookAt(leftBoard.position.clone().add(tangent));
  scene.add(leftBoard);

  const rightBoard = new THREE.Mesh(geometry, material);
  rightBoard.position.copy(pos).add(side.clone().multiplyScalar(- (trackRadius + sidingDepth)));
  rightBoard.position.y += trackRadius;
  rightBoard.lookAt(rightBoard.position.clone().add(tangent));
  scene.add(rightBoard);
}

// Add siding boards at intervals along the track every 0.1 in t.
for (let tVal = 0; tVal < 1; tVal += 0.1) {
  addSiding(tVal);
}

// Add a simple ground plane for context.
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // forest green
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = - Math.PI / 2;
groundMesh.position.y = -5;
scene.add(groundMesh);

/*
  Physics-based simulation for the coaster along the track.
  A chain-lift mechanism is applied during the initial (first hill) portion of the track.
  The coaster is simulated as a point mass moving along the track.
*/
const clock = new THREE.Clock();
const totalTrackLength = trackCurve.getLength();
let s = 0; // arc length traveled along the track
let v = 2; // initial velocity in m/s along the track

const g = 9.81;       // gravitational acceleration
const friction = 0.5; // damping factor for realistic behavior

// Define a chain-lift portion using a threshold (portion of the track parameter t).
const chainLiftThreshold = 0.3; // first 30% of the track acts as chain lift
const chainLiftAcceleration = 3.0; // additional acceleration provided by the chain lift

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // Map arc-length s to normalized parameter tParam.
  let tParam = mod1(s / totalTrackLength);
  let tangent = trackCurve.getTangentAt(tParam).normalize();

  // Check if we are within the chain-lift section.
  if (tParam < chainLiftThreshold) {
    // Override physics with chain lift boost.
    v += chainLiftAcceleration * deltaTime;
    s += v * deltaTime;
  } else {
    // Normal physics simulation.
    const accel = -g * tangent.y - friction * v;
    v += accel * deltaTime;
    if (v < 0.5) v = 0.5;
    s += v * deltaTime;
  }
  // Loop the coaster along the closed track.
  s = s % totalTrackLength;

  // Update current parameter after movement.
  tParam = mod1(s / totalTrackLength);
  const baseCameraPos = trackCurve.getPointAt(tParam);
  camera.position.set(
    baseCameraPos.x,
    baseCameraPos.y + cameraYOffset,
    baseCameraPos.z
  );

  // Look ahead along the track.
  const lookAheadS = s + 2; // look ahead 2 meters
  const lookAheadT = mod1(lookAheadS / totalTrackLength);
  const lookAtPoint = trackCurve.getPointAt(lookAheadT);
  camera.lookAt(new THREE.Vector3(lookAtPoint.x, lookAtPoint.y + cameraYOffset, lookAtPoint.z));

  // Optional: add a slight banking effect based on the track's derivative.
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

// Start the physics-based simulation animation loop.
animate();