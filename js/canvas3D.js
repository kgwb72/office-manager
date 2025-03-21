class Canvas3D {
    constructor(canvasId) {
        this.container = document.getElementById(canvasId);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);
        
        // Set up lighting
        this.setupLighting();
        
        // Set up controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        
        // Set initial camera position
        this.camera.position.set(0, 200, 200);
        this.camera.lookAt(0, 0, 0);
        
        // Start animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (like sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 400, 200);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Enable shadows
        this.renderer.shadowMap.enabled = true;
    }
    
    // Animation loop
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    // Handle window resize
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    // Add an office object to the scene
    addObject(officeObject) {
        officeObject.createThreeObject(this.scene);
    }
    
    // Clear all objects from the scene
    clear() {
        while(this.scene.children.length > 0) { 
            this.scene.remove(this.scene.children[0]); 
        }
        this.setupLighting(); // Re-add lights
    }
    
    // Add a floor
    addFloor(width = 1000, depth = 1000) {
        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xeeeeee,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        floor.receiveShadow = true;
        this.scene.add(floor);
    }
}