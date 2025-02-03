/* 
  Main script for the 3D wooden roller coaster ride.
  Enhancements:
    - Redesigned track with no sharp turns.
    - The first hill is the highest for proper physics.
    - Detailed wooden roller coaster track with siding running along its length.
    - Physics-based simulation for the coaster along the track.
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

/*
  Redesign the track with smoother turns and a highest first hill.
  Control points are carefully chosen so that the track flows naturally,
  with the first hill reaching the maximum elevation.
*/
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(5, 15, 0),       // First hill: highest point
  new THREE.Vector3(15, 10, -10),
  new THREE.Vector3(25, 5, -5),
  new THREE.Vector3(35, 3, 10),
  new THREE.Vector3(45, 5, 15),
  new THREE.Vector3(55, 7, 5),
  new THREE.Vector3(65, 3, -10),
  new THREE.Vector3(70, 0, 0),
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

  // Dimensions for the siding board
  const sidingWidth = 2.5; // length along the track edge
  const sidingHeight = 0.1;
  const sidingDepth = 0.05;
  const geometry = new THREE.BoxGeometry(sidingWidth, sidingHeight, sidingDepth);
  const material = new THREE.MeshStandardMaterial({
    color: 0xA0522D, // sienna for a slightly different wood tone
    roughness: 0.95,
    metalness: 0.0
  });
  
  // Create board on the left side
  const leftBoard = new THREE.Mesh(geometry, material);
  leftBoard.position.copy(pos).add(side.clone().multiplyScalar(trackRadius + sidingDepth));
  // Slightly offset vertically so it lines with the top of the track
  leftBoard.position.y += trackRadius;
  // Rotate so board lays flush to the track along its tangent.
  leftBoard.lookAt(leftBoard.position.clone().add(tangent));
  scene.add(leftBoard);

  // Create board on the right side
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

// Add a simple ground plane for context
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // forest green
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = - Math.PI / 2;
groundMesh.position.y = -5;
scene.add(groundMesh);

/*
  Physics-based simulation for the coaster along the track.
  We simulate a roller coaster car as a point mass moving along the track based on gravity and friction.
  Instead of a fixed constant speed, we now use an acceleration computed from the track's slope.
*/
const clock = new THREE.Clock();

// Compute the total length of the track.
const totalTrackLength = trackCurve.getLength();
let s = 0; // arc length traveled along the track (in "meters" relative to our scene scale)
let v = 2; // initial velocity in m/s along the track
const g = 9.81; // gravitational acceleration in m/s²
const friction = 0.5; // damping factor (adjust for realistic behavior)

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // Map arc-length s to normalized parameter tParam.
  const tParam = mod1(s / totalTrackLength);

  // Get the tangent at the current position for computing effective gravitational acceleration.
  const tangent = trackCurve.getTangentAt(tParam).normalize();

  // The acceleration along the track: component of gravity (projected) minus friction.
  // When tangent.y is positive, the track is ascending (gravity opposes motion)
  // When tangent.y is negative, the track is descending (gravity aids motion).
  const accel = -g * tangent.y - friction * v;

  // Update velocity and position (s) along the track.
  v += accel * deltaTime;
  // Prevent the velocity from going negative to simulate that the coaster won't reverse.
  if (v < 0.5) v = 0.5;
  s += v * deltaTime;
  // Loop the coaster along the closed track.
  s = s % totalTrackLength;

  // Determine the current position of the coaster along the track.
  const baseCameraPos = trackCurve.getPointAt(mod1(s / totalTrackLength));
  camera.position.set(
    baseCameraPos.x,
    baseCameraPos.y + cameraYOffset,
    baseCameraPos.z
  );

  // Look ahead along the track for a proper view direction.
  const lookAheadS = s + 2; // look ahead 2 meters
  const lookAheadT = mod1(lookAheadS / totalTrackLength);
  const lookAtPoint = trackCurve.getPointAt(lookAheadT);
  camera.lookAt(new THREE.Vector3(lookAtPoint.x, lookAtPoint.y + cameraYOffset, lookAtPoint.z));

  // Optional: add a slight banking effect based on the curve's derivative.
  // Compute a banking axis and apply a modest rotation.
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