class Canvas3D {
    constructor(canvasId) {
        this.container = document.getElementById(canvasId);
        if (!this.container) {
            throw new Error(`Container element with ID ${canvasId} not found`);
        }
        
        // Check if THREE is loaded
        if (typeof THREE === 'undefined') {
            console.error('THREE.js library not loaded!');
            this.showError('Required THREE.js library not loaded. Please check your network connection and reload the page.');
            return;
        }
        
        // Initialize Three.js components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Set up lighting
        this.setupLighting();
        
        // Set up controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.25;
            this.controls.screenSpacePanning = false;
            this.controls.maxPolarAngle = Math.PI / 2;
        } else {
            console.warn('THREE.OrbitControls not loaded, camera controls will be limited');
        }
        
        // Set initial camera position
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);
        
        // Add floor by default
        this.addFloor();
        
        // Create controls UI
        this.createControls();
        
        // Start animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        console.log('Canvas3D initialized');
    }
    
    setupLighting() {
        // Clear existing lights
        this.scene.children = this.scene.children.filter(child => !(child instanceof THREE.Light));
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (like sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 400, 200);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        
        this.scene.add(directionalLight);
    }
    
    createControls() {
        // Create controls container if it doesn't exist
        let controlsContainer = document.querySelector('.threejs-controls');
        if (!controlsContainer) {
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'threejs-controls';
            this.container.appendChild(controlsContainer);
        }
        
        // Clear existing controls
        controlsContainer.innerHTML = '';
        
        // Add control buttons
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset View';
        resetButton.addEventListener('click', () => this.resetCamera());
        
        const topViewButton = document.createElement('button');
        topViewButton.textContent = 'Top View';
        topViewButton.addEventListener('click', () => this.setTopView());
        
        const frontViewButton = document.createElement('button');
        frontViewButton.textContent = 'Front View';
        frontViewButton.addEventListener('click', () => this.setFrontView());
        
        const rightViewButton = document.createElement('button');
        rightViewButton.textContent = 'Right View';
        rightViewButton.addEventListener('click', () => this.setRightView());
        
        // Add buttons to container
        controlsContainer.appendChild(resetButton);
        controlsContainer.appendChild(topViewButton);
        controlsContainer.appendChild(frontViewButton);
        controlsContainer.appendChild(rightViewButton);
    }
    
    // Animation loop
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    // Handle window resize
    onWindowResize() {
        if (!this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    // Add a floor plane
    addFloor(width = 1000, depth = 1000) {
        // Remove existing floor if any
        const existingFloor = this.scene.children.find(child => 
            child.userData && child.userData.isFloor);
        
        if (existingFloor) {
            this.scene.remove(existingFloor);
        }
        
        // Create grid helper
        const gridHelper = new THREE.GridHelper(width, 20, 0x888888, 0xcccccc);
        gridHelper.position.y = 0.1; // Slightly above floor to prevent z-fighting
        this.scene.add(gridHelper);
        
        // Create floor plane
        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xeeeeee,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        floor.position.y = 0;
        floor.receiveShadow = true;
        floor.userData = { isFloor: true };
        
        this.scene.add(floor);
        
        return floor;
    }
    
    // Add an office object to the scene
    addObject(officeObject) {
        if (officeObject && officeObject.createThreeObject) {
            officeObject.createThreeObject(this.scene);
        }
    }
    
    // Clear all objects from the scene except lights and floor
    clear() {
        // Filter out objects to keep (lights and floor)
        this.scene.children = this.scene.children.filter(child => 
            child instanceof THREE.Light || 
            (child.userData && child.userData.isFloor) ||
            child instanceof THREE.GridHelper
        );
    }
    
    // Camera control methods
    resetCamera() {
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);
        
        if (this.controls) {
            this.controls.reset();
        }
    }
    
    setTopView() {
        this.camera.position.set(0, 500, 0);
        this.camera.lookAt(0, 0, 0);
        
        if (this.controls) {
            this.controls.update();
        }
    }
    
    setFrontView() {
        this.camera.position.set(0, 100, 500);
        this.camera.lookAt(0, 100, 0);
        
        if (this.controls) {
            this.controls.update();
        }
    }
    
    setRightView() {
        this.camera.position.set(500, 100, 0);
        this.camera.lookAt(0, 100, 0);
        
        if (this.controls) {
            this.controls.update();
        }
    }
    
    // Zoom controls
    zoomIn() {
        this.camera.position.multiplyScalar(0.9);
        
        if (this.controls) {
            this.controls.update();
        }
    }
    
    zoomOut() {
        this.camera.position.multiplyScalar(1.1);
        
        if (this.controls) {
            this.controls.update();
        }
    }
    
    // Show error message in container
    showError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        errorContainer.innerHTML = `
            <p>${message}</p>
            <button class="retry-button">Retry</button>
        `;
        
        // Clear container and append error
        this.container.innerHTML = '';
        this.container.appendChild(errorContainer);
        
        // Add retry handler
        const retryButton = errorContainer.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
}