/* 
  Main script for the 3D wooden roller coaster ride.
  Enhancements:
    - Detailed roller coaster geometry with wooden aesthetics.
    - Wooden track, ties, and supports replacing the previous metal design.
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

// Set up camera: We'll animate the camera to follow along the track with a vertical offset.
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
const cameraYOffset = 2; // Raise the camera so that it is a bit higher than the track

// Add ambient light and directional light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

// Create the roller coaster track curve using CatmullRomCurve3 with custom control points
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 5, -5),
  new THREE.Vector3(20, 0, -10),
  new THREE.Vector3(30, -5, 0),
  new THREE.Vector3(40, 0, 10),
  new THREE.Vector3(30, 5, 20),
  new THREE.Vector3(20, 10, 10),
  new THREE.Vector3(10, 5, 0),
  new THREE.Vector3(0, 0, 0) // closing loop
];
const trackCurve = new THREE.CatmullRomCurve3(points, true); // closed loop

// Create the tube geometry for the roller coaster track with higher detail.
// We'll use a tube geometry but give it a wooden look.
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
  // If tangent is near vertical, fallback to a default side vector.
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();

  // Dimensions for the tie: long along the side, narrow in depth, and thin vertically.
  const tieWidth = trackRadius * 5;
  const tieHeight = 0.15;
  const tieDepth = 0.05;
  const geometry = new THREE.BoxGeometry(tieWidth, tieHeight, tieDepth);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
  const tieMesh = new THREE.Mesh(geometry, material);

  // The tie should be centered on the track, slightly below the tube to simulate a board.
  tieMesh.position.copy(pos);
  tieMesh.position.y -= trackRadius * 0.8; // slight downward offset

  // Orient the tie so that its long axis (local X) aligns with the side vector.
  // Create a rotation matrix using side (X), up (Y) and tangent (Z) vectors.
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
  Instead of cylindrical metal supports, we create twin wooden posts on each side of the track.
*/
function addSupport(tVal) {
  // Get base position on the track and tangent to compute lateral offset.
  const pos = trackCurve.getPointAt(tVal);
  const tangent = trackCurve.getTangentAt(tVal).normalize();

  // Compute a side vector perpendicular to the tangent.
  const up = new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(up, tangent);
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();

  const groundLevel = -5;
  // Determine the support height based on the current track height relative to ground.
  const supportHeight = pos.y - groundLevel;
  if (supportHeight <= 0.5) return; // Skip supports if nearly at ground

  // Dimensions for a support post
  const postWidth = 0.2;
  const postDepth = 0.2;
  const geometry = new THREE.BoxGeometry(postWidth, supportHeight, postDepth);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
  
  // Left support post
  const leftPost = new THREE.Mesh(geometry, material);
  // Offset to the left side of the track
  leftPost.position.copy(pos).add(side.clone().multiplyScalar(trackRadius + postWidth));
  leftPost.position.y = (pos.y + groundLevel) / 2; // center post vertically from ground to track
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

// Variables for the camera along the track animation
let t = 0;
const speed = 0.0005; // Adjust this value for coaster speed

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update parameter t along the track. Loop back upon completing a circuit.
  t = mod1(t + speed);

  // Position the camera on the track and apply the upward offset
  const baseCameraPos = trackCurve.getPointAt(t);
  camera.position.set(
    baseCameraPos.x,
    baseCameraPos.y + cameraYOffset,
    baseCameraPos.z
  );

  // Determine the next point along the track for the camera to look at
  const lookAheadT = mod1(t + 0.01);
  const lookAtPoint = trackCurve.getPointAt(lookAheadT);
  camera.lookAt(new THREE.Vector3(lookAtPoint.x, lookAtPoint.y + cameraYOffset, lookAtPoint.z));

  // Optional: add a slight banking effect based on the curve's derivative
  const tangent = trackCurve.getTangentAt(t).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
  const angle = Math.acos(up.dot(tangent));
  camera.up.copy(up).applyAxisAngle(axis, angle * 0.2); // adjust banking effect

  renderer.render(scene, camera);
}

// Resize listener for mobile responsiveness
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('resize', onWindowResize, false);

// Start the animation
animate();