
/**
 * Main Application Controller
 * Handles initialization and coordination between different parts of the application
 */
class App {
    constructor() {
        // Core properties
        this.keyboardCtrl = false;
        this.canvas2d = null;
        this.canvas3d = null;
        this.activeMode = '2d'; // Default to 2D mode
        this.selectedObject = null;
        this.objects = []; // Store all office objects
        this.users = []; // Store all users
        this.gridSize = 5; // Grid size for snapping (in pixels)
        this.snapThreshold = 5; // Radius in pixels for endpoint snapping
        
        this.wallToWallSnap = true; // Enable wall-to-wall snapping
        this.objectToWallSnap = true; // Enable object-to-wall snapping
        
        this.drawingWall = false;
        this.tempWall = null;
        this.startPoint = null;
        
        // Wall drawing properties
        this.wallDrawingStartPoint = null;
        this.wallDrawingPreview = null;
        
        // Config
        this.config = {
            apiUrl: 'https://localhost:44317/api',
            useMockAuth: true, // Set to false for production
            useMockData: false  // Set to false for production
        };
        
        // Add new services
        this.authService = null;
        this.serverData = null;
        this.panoramaViewer = null;
        this.locationManager = null;
        this.seatManager = null;
        this.departmentZoneManager = null;
        this.fileUploadManager = null;
        
        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', () => this.init());
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Office Manager application...');
            
            // Show loading indicator
            this.showLoading('Initializing application...');
            
            // Initialize services first
            await this.initializeServices();
            
            // Initialize canvases
            this.initializeCanvases();
            
            // Set up event listeners for UI controls
            this.setupEventListeners();
            
            // Load users data
            await this.loadUsers();
            
            // Hide loading indicator
            this.hideLoading();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.hideLoading();
            this.showError('Failed to initialize application: ' + error.message);
        }
    }
    
    /**
     * Initialize application services
     */
    async initializeServices() {
        // Initialize auth service
        this.authService = new AuthService();
        this.authService.useMock = this.config.useMockAuth;
        
        // Initialize server data service
        this.serverData = window.serverDataService;
        this.serverData.apiBaseUrl = this.config.apiUrl;
        
        // Set up authentication token if user is logged in
        const userInfo = await this.authService.getUserInfo();
        if (userInfo && userInfo.token) {
            this.serverData.setAuthToken(userInfo.token);
        }else {
            // Auto-login for development purposes
            // You can remove this in production
            try {
                const loginResult = await this.serverData.login({
                    email: "admin@example.com",  // Use your admin credentials
                    password: "YourPassword123"  // Use your admin password
                });
                
                if (loginResult && loginResult.token) {
                    this.serverData.setAuthToken(loginResult.token);
                    console.log("Auto-login successful");
                }
            } catch (error) {
                console.error("Auto-login failed:", error);
            }
        }
        
        // Add event listeners for login/logout buttons
        document.getElementById('login-button')?.addEventListener('click', () => {
            this.authService.login().then(user => {
                if (user) {
                    console.log('User logged in:', user);
                    this.authService.getUserInfo().then(userInfo => {
                        if (userInfo && userInfo.token) {
                            this.serverData.setAuthToken(userInfo.token);
                        }
                    });
                    
                    // Reload data
                    if (this.locationManager) {
                        this.locationManager.initialize();
                    }
                }
            });
        });
        
        document.getElementById('logout-button')?.addEventListener('click', () => {
            this.authService.logout().then(() => {
                console.log('User logged out');
                this.serverData.setAuthToken(null);
                
                // Reload with no data
                if (this.locationManager) {
                    this.locationManager.initialize();
                }
            });
        });
        
        // Initialize panorama viewer (if container exists)
        const panoramaContainer = document.getElementById('panorama-container');
        if (panoramaContainer) {
            this.panoramaViewer = new PanoramaViewer('panorama-container');
        }
        
        // Wait for Canvas initialization before initializing managers
    }
    
    /**
     * Load users data from API or mock
     */
    async loadUsers() {
        try {
            this.showLoading('Loading users...');
            
            let loadedUsers = [];
            
            // If we have a server connection
            if (this.serverData && !this.config.useMockData) {
                loadedUsers = await this.serverData.getUsers();
            } else {
                // Generate mock users for development
                loadedUsers = this.generateMockUsers();
            }
            
            // Convert to User objects
            this.users = loadedUsers.map(userData => new User(
                userData.id,
                userData.displayName || userData.name,
                userData.email,
                userData.department || 'No Department',
                userData.photoUrl || ''
            ));
            
            this.hideLoading();
            console.log('Loaded users:', this.users.length);
        } catch (error) {
            console.error('Failed to load users:', error);
            this.hideLoading();
            this.showError('Failed to load users: ' + error.message);
            
            // Generate mock users as fallback
            this.users = this.generateMockUsers();
        }
    }
    
    /**
     * Initialize the 2D and 3D canvases
     */
    initializeCanvases() {
        // Initialize 2D canvas using Fabric.js
        const canvas2dElement = document.getElementById('canvas-2d');
        if (!canvas2dElement) {
            console.error("Canvas 2D element not found");
            return;
        }
        
        // First check if Fabric.js is loaded
        if (typeof fabric === 'undefined') {
            console.error("Fabric.js library not loaded!");
            this.showError("Required Fabric.js library not loaded. Please check your network connection and reload the page.");
            return;
        }
        
        this.canvas2d = new fabric.Canvas('canvas-2d');
        
        // Get the canvas wrapper dimensions and set the canvas size accordingly
        const canvasWrapper = document.getElementById('canvas-wrapper');
        const wrapperWidth = canvasWrapper.clientWidth;
        const wrapperHeight = canvasWrapper.clientHeight;
        
        // Set canvas dimensions to fit the wrapper
        this.canvas2d.setWidth(wrapperWidth || 800);
        this.canvas2d.setHeight(wrapperHeight || 600);
        
        // Setup 3D canvas if Three.js is loaded
        this.canvas3dElement = document.getElementById('canvas-3d-container');
        
        if (this.canvas3dElement && typeof THREE !== 'undefined') {
            this.canvas3d = new Canvas3D('canvas-3d-container');
        } else if (this.canvas3dElement) {
            console.warn('THREE.js not loaded - 3D view will not be available');
        }
        
        console.log('Canvases initialized');
        
        // Now initialize managers that need canvas reference
        this.initializeManagers();
    }
    
    /**
     * Initialize managers after canvas is ready
     */
    initializeManagers() {
        // Initialize location manager
        this.locationManager = new LocationManager(this);
        
        // Initialize seat manager
        this.seatManager = new SeatAssignmentManager(this);
        
        // Initialize department zone manager
        this.departmentZoneManager = new DepartmentZoneManager(this);
        
        // Initialize file upload manager
        this.fileUploadManager = new FileUploadManager(this);
    }
    
    /**
     * Set up event listeners for UI controls
     */
    setupEventListeners() {
        // View toggle buttons
        document.getElementById('toggle-2d')?.addEventListener('click', () => this.setActiveMode('2d'));
        document.getElementById('toggle-3d')?.addEventListener('click', () => this.setActiveMode('3d'));
        document.getElementById('toggle-360')?.addEventListener('click', () => this.setActiveMode('360'));
        
        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view')?.addEventListener('click', () => this.resetView());
        
        // Tool buttons
        document.getElementById('add-seat-desk')?.addEventListener('click', () => this.activateTool('add-seat-desk'));
        document.getElementById('add-desk')?.addEventListener('click', () => this.activateTool('add-desk'));
        document.getElementById('select-tool')?.addEventListener('click', () => this.activateTool('select'));
        document.getElementById('add-wall')?.addEventListener('click', () => this.activateTool('add-wall'));
        document.getElementById('delete-tool')?.addEventListener('click', () => this.activateTool('delete'));
        
        // Layout saving/loading
        document.getElementById('save-layout')?.addEventListener('click', () => this.saveLayout());
        document.getElementById('load-layout')?.addEventListener('click', () => this.loadLayout());
        
        // Background SVG management
        const uploadSvgBgBtn = document.getElementById('upload-svg-bg');
        const removeSvgBgBtn = document.getElementById('remove-svg-bg');
        
        if (uploadSvgBgBtn) {
            uploadSvgBgBtn.addEventListener('click', () => this.loadSvgBackground());
        }
        
        if (removeSvgBgBtn) {
            removeSvgBgBtn.addEventListener('click', () => this.removeSvgBackground());
        }
        
        // Set up canvas object event handlers
        this.setupCanvasObjectEventHandlers();
        
        // Keyboard event handlers
        this.setupKeyboardEventHandlers();
        
        // Add wheel event listener for zooming
        document.getElementById('canvas-2d')?.addEventListener('wheel', (e) => this.handleMouseWheel(e), { passive: false });
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Get the canvas wrapper dimensions
        const canvasWrapper = document.getElementById('canvas-wrapper');
        if (!canvasWrapper) return;
        
        const wrapperWidth = canvasWrapper.clientWidth;
        const wrapperHeight = canvasWrapper.clientHeight;
        
        // Update 2D canvas size
        if (this.canvas2d) {
            this.canvas2d.setWidth(wrapperWidth);
            this.canvas2d.setHeight(wrapperHeight);
            this.canvas2d.renderAll();
        }
        
        // Update 3D canvas size if we have one
        if (this.canvas3d) {
            this.canvas3d.onWindowResize();
        }
    }
    
    /**
     * Set up canvas object event handlers
     */
    setupCanvasObjectEventHandlers() {
        if (!this.canvas2d) return;
        
        // Object moving event handler
        this.canvas2d.on('object:moving', (e) => {
            const obj = e.target;
            if (!obj) return;
            
            // Apply grid snapping if Ctrl is pressed (for all objects)
            if (this.keyboardCtrl) {
                this.snapObjectToGrid(obj);
            }
        });
        
        // Object rotation event handler
        this.canvas2d.on('object:rotating', (e) => {
            const obj = e.target;
            if (!obj) return;
            
            // Apply rotation snapping if Ctrl is pressed
            if (this.keyboardCtrl) {
                const snapAngle = 15; // Snap to 15-degree increments
                obj.angle = Math.round(obj.angle / snapAngle) * snapAngle;
            }
        });
        
        // Set up wall drawing handlers
        this.setupWallDrawingHandlers();
    }
    
    /**
     * Set up wall drawing handlers
     */
    setupWallDrawingHandlers() {
        if (!this.canvas2d) return;
        
        // Mouse move for wall drawing
        this.canvas2d.on('mouse:move', (e) => {
            if (this.drawingWall && this.startPoint && this.tempWall) {
                const pointer = this.canvas2d.getPointer(e.e);
                
                // Calculate width and height based on start and current point
                const width = Math.abs(pointer.x - this.startPoint.x);
                const height = Math.abs(pointer.y - this.startPoint.y);
                
                this.canvas2d.renderAll();
            }
        });
        
        // Mouse down event handler to initiate wall drawing
        this.canvas2d.on('mouse:down', (e) => {
            if (this.activeWallDrawing && !this.drawingWall) {
                const pointer = this.canvas2d.getPointer(e.e);
                
                this.startPoint = { x: pointer.x, y: pointer.y };
                this.drawingWall = true;
                
                // Create a temporary wall visualization
                this.tempWall = new fabric.Rect({
                    left: this.startPoint.x,
                    top: this.startPoint.y,
                    width: 1,
                    height: 1,
                    fill: '#e8e8e8',
                    stroke: '#333',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false
                });
                
                this.canvas2d.add(this.tempWall);
            } else if (this.activeWallDrawing && this.drawingWall) {
                const pointer = this.canvas2d.getPointer(e.e);
                
                // Remove the temporary visual wall
                this.canvas2d.remove(this.tempWall);
                
                // Calculate width and height
                const width = Math.abs(pointer.x - this.startPoint.x);
                const height = Math.abs(pointer.y - this.startPoint.y);
                
                this.addWall(
                    'wall_' + Date.now(),
                    this.startPoint.x,
                    this.startPoint.y,
                    width,
                    10, // Fixed height for horizontal wall
                );
                
                // Reset wall drawing state
                this.drawingWall = false;
                this.startPoint = null;
                this.tempWall = null;
                
                // Switch back to select tool after drawing
                if (this.activeWallDrawing) {
                    this.activeWallDrawing = false;
                    this.activateTool('select');
                }
            }
        });
    }
    
    /**
     * Set up keyboard event handlers
     */
    setupKeyboardEventHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control') {
                this.keyboardCtrl = true;
                console.log('Snapping activated');
                
                // Show visual indication of snapping mode
                const canvasContainer = document.querySelector('.canvas-container');
                if (canvasContainer) {
                    canvasContainer.classList.add('snapping-active');
                }
            }
            
            if (e.key === 'Delete') { 
                const activeObjects = this.canvas2d.getActiveObjects();                
                activeObjects.forEach(obj => {
                    this.canvas2d.remove(obj);
                });            
            }
            
            if (e.key === 'Escape' && this.drawingWall) {
                // Cancel wall drawing
                if (this.tempWall) {
                    this.canvas2d.remove(this.tempWall);
                }
                this.drawingWall = false;
                this.startPoint = null;
                this.tempWall = null;
                
                // Switch back to select tool
                if (this.activeWallDrawing) {
                    this.activeWallDrawing = false;
                    this.activateTool('select');
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
                this.keyboardCtrl = false;
                console.log('Snapping deactivated');
                
                // Remove visual indication of snapping mode
                const canvasContainer = document.querySelector('.canvas-container');
                if (canvasContainer) {
                    canvasContainer.classList.remove('snapping-active');
                }
            }
        });
    }
    
    /**
     * Snap an object to the grid
     * @param {fabric.Object} obj - The fabric object to snap
     */
    snapObjectToGrid(obj) {
        // Calculate the nearest grid position
        const gridSize = this.gridSize;
        obj.set({
            left: Math.round(obj.left / gridSize) * gridSize,
            top: Math.round(obj.top / gridSize) * gridSize
        });
    }
    
    /**
     * Show visual feedback for snapping
     * @param {number} x - X coordinate for feedback
     * @param {number} y - Y coordinate for feedback
     */
    showSnapFeedback(x, y) {
        // Create a temporary snap indicator
        const indicator = new fabric.Circle({
            left: x - 5,
            top: y - 5,
            radius: 5,
            fill: 'rgba(0, 255, 0, 0.5)',
            stroke: 'rgba(0, 255, 0, 0.8)',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        
        this.canvas2d.add(indicator);
        
        // Remove after a short delay
        setTimeout(() => {
            this.canvas2d.remove(indicator);
            this.canvas2d.renderAll();
        }, 300);
    }
    
    /**
     * Handle mouse wheel events for zooming
     */
    handleMouseWheel(e) {
        e.preventDefault();
        
        if (this.activeMode !== '2d' || !this.canvas2d) {
            return;
        }
        
        // Get mouse position in canvas coordinates before zoom
        const pointer = this.screenToWorld(e.clientX, e.clientY);
        
        // Calculate zoom factor based on wheel direction
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        
        // Get current zoom level and calculate new zoom level
        const zoom = this.canvas2d.getZoom();
        const newZoom = Math.max(0.2, Math.min(5, zoom * zoomFactor));
        
        // Set zoom with point as the center
        this.canvas2d.zoomToPoint({ x: pointer.x, y: pointer.y }, newZoom);
        
        // Render the canvas with the new zoom
        this.canvas2d.requestRenderAll();
    }
    
    /**
     * Convert screen coordinates to canvas world coordinates
     */
    screenToWorld(screenX, screenY) {
        if (!this.canvas2d) return { x: 0, y: 0 };
        
        const canvas = document.getElementById('canvas-2d');
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        
        // Get inverse transform to convert from screen to canvas coordinates
        const transform = this.canvas2d.viewportTransform;
        const inverseTransform = fabric.util.invertTransform(transform);
        
        // Apply the inverse transform to get world coordinates
        const point = fabric.util.transformPoint(
            { x: canvasX, y: canvasY },
            inverseTransform
        );
        
        return point;
    }
    
    /**
     * Add a desk with chair to the canvas
     */
    addDeskWithChair(id, x, y, rotation = 0, options = {}) {
        if (!this.canvas2d) return null;
        
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const deskWithChair = new DeskWithChair(id, position, rotationObj, options);
        
        try {
            const fabricObject = deskWithChair.createFabricObject(this.canvas2d);
            
            // Add collision handling attributes
            if (fabricObject) {
                fabricObject.lastValidLeft = fabricObject.left;
                fabricObject.lastValidTop = fabricObject.top;
                fabricObject.lastRotation = fabricObject.angle;
            }
            
            // Store in objects array
            this.objects.push(deskWithChair);
            
            return deskWithChair;
        } catch (error) {
            console.error('Failed to add desk with chair:', error);
            return null;
        }
    }
    
    /**
     * Add a desk to the canvas
     */
    addDesk(id, x, y, rotation = 0, options = {}) {
        if (!this.canvas2d) return null;
        
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const desk = new Desk(id, position, rotationObj, options);
        
        try {
            const fabricObject = desk.createFabricObject(this.canvas2d);
            
            // Add collision handling attributes
            if (fabricObject) {
                fabricObject.lastValidLeft = fabricObject.left;
                fabricObject.lastValidTop = fabricObject.top;
                fabricObject.lastRotation = fabricObject.angle;
            }
            
            // Store in objects array
            this.objects.push(desk);
            
            return desk;
        } catch (error) {
            console.error('Failed to add desk:', error);
            return null;
        }
    }
    
    /**
     * Add a wall to the canvas
     */
    addWall(id, startX, startY, width, height, options = {}) {
        if (!this.canvas2d) return null;
        
        try {
            const pointer = this.canvas2d.getPointer(event ? event.e : window.event);
            const endX = pointer.x;
            const endY = pointer.y;
            
            // Calculate wall dimensions and position
            const wallWidth = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            
            // Calculate the midpoint between start and end points for proper positioning
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            // Calculate rotation angle in degrees
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
            console.log('Wall angle:', angle,endX,endY,startX,startY);
            
            const position = { x: midX, y: midY, z: midY };
            const dimensions = { 
                width: wallWidth,
                height: options.height || 250, 
                depth: options.thickness || 10 
            };
            options.angle = angle;
            
        
            const rotationObj = { 
                x: 0, 
                y: angle * Math.PI / 180, 
                z: 0 
            };
            
            const wallOptions = {
                ...options,
                thickness: options.thickness || 10,
                color: options.color || '#414141'
            };
            
            // Create and add the wall
            const wall = new Wall(id, position, rotationObj, dimensions, wallOptions);
            wall.createFabricObject(this.canvas2d);
            
            // Add to objects array if not already tracking
            if (!this.objects.includes(wall)) {
                this.objects.push(wall);
            }
            
            return wall;
        } catch (error) {
            console.error('Failed to add wall:', error);
            return null;
        }
    }
    
    /**
     * Set the active viewing mode (2D, 3D, or 360)
     */
    setActiveMode(mode) {
        if (!['2d', '3d', '360'].includes(mode)) return;
        
        this.activeMode = mode;
        
        // Update UI
        document.getElementById('toggle-2d')?.classList.toggle('active', mode === '2d');
        document.getElementById('toggle-3d')?.classList.toggle('active', mode === '3d');
        document.getElementById('toggle-360')?.classList.toggle('active', mode === '360');
        
        // Show/hide appropriate canvas
        if (document.getElementById('canvas-2d')) {
            document.getElementById('canvas-2d').classList.toggle('active', mode === '2d');
        }
        
        if (document.getElementById('canvas-3d-container')) {
            document.getElementById('canvas-3d-container').classList.toggle('active', mode === '3d');
            
            // Initialize 3D view if needed
            if (mode === '3d' && this.canvas3d) {
                // Sync 3D view with 2D objects
                this.updateThreeFromFabric();
            }
        }
        
        if (document.getElementById('panorama-container')) {
            document.getElementById('panorama-container').classList.toggle('active', mode === '360');
            
            // Initialize panorama if needed
            if (mode === '360' && this.panoramaViewer) {
                this.panoramaViewer.show();
            }
        }
        
        console.log(`View mode switched to ${mode}`);
    }
    
    /**
     * Update 3D view from 2D canvas
     */
    updateThreeFromFabric() {
        if (!this.canvas3d || !this.objects.length) return;
        
        // Clear 3D scene
        this.canvas3d.clear();
        
        // Add floor
        this.canvas3d.addFloor();
        
        // Add all objects to 3D scene
        this.objects.forEach(obj => {
            obj.createThreeObject(this.canvas3d.scene);
        });
    }
    
    /**
     * Activate a tool based on button click
     */
    activateTool(toolName) {
        // Reset all tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activate the selected tool
        const toolButton = document.getElementById(`${toolName}-tool`) || 
            document.getElementById(toolName);
        
        if (toolButton) {
            toolButton.classList.add('active');
        }
        
        // Reset active wall drawing flag
        this.activeWallDrawing = false;
        
        // Clean up any in-progress drawing
        this.cancelWallDrawing();
        
        // Handle tool-specific logic
        switch (toolName) {
            case 'add-desk':
                // Set canvas to non-selection mode for desk placement
                this.canvas2d.selection = false;
                document.body.style.cursor = 'crosshair';
                const addDeskHandler = (e) => {
                    // Get coordinates in canvas space
                    const pointer = this.canvas2d.getPointer(e.e);
                    
                    // Add desk at the pointer position
                    const desk = this.addDesk(
                        'desk_' + Date.now(), 
                        pointer.x, 
                        pointer.y
                    );
                    
                    // Add to objects array if not already tracking
                    if (this.objects && !this.objects.includes(desk)) {
                        this.objects.push(desk);
                    }
                    
                    // Remove this event handler after first use
                    this.canvas2d.off('mouse:down', addDeskHandler);
                    
                    // Reset cursor
                    document.body.style.cursor = 'default';
                    
                    // Switch back to select tool
                    this.activateTool('select');
                };
                
                // Add the one-time event handler
                this.canvas2d.on('mouse:down', addDeskHandler);
                console.log('Add desk tool activated');
                break;
                
            case 'add-seat-desk':
                // Set canvas to non-selection mode for desk placement
                this.canvas2d.selection = false;
                
                // Change cursor for better UX
                document.body.style.cursor = 'crosshair';
                
                // Create a one-time event handler for mouse:down
                const addDeskChairHandler = (e) => {
                    // Get coordinates in canvas space
                    const pointer = this.canvas2d.getPointer(e.e);
                    
                    // Apply grid snapping if Ctrl is pressed
                    let x = pointer.x;
                    let y = pointer.y;
                    
                    if (this.keyboardCtrl) {
                        x = Math.round(x / this.gridSize) * this.gridSize;
                        y = Math.round(y / this.gridSize) * this.gridSize;
                    }
                    
                    // Add desk at the pointer position
                    const deskWithChair = this.addDeskWithChair(
                        'seat_' + Date.now(), 
                        x, 
                        y
                    );
                    
                    // Add to objects array if not already tracking
                    if (this.objects && !this.objects.includes(deskWithChair) && deskWithChair) {
                        this.objects.push(deskWithChair);
                    }
                    
                    // Remove this event handler after first use
                    this.canvas2d.off('mouse:down', addDeskChairHandler);
                    
                    // Reset cursor
                    document.body.style.cursor = 'default';
                    
                    // Switch back to select tool
                    this.activateTool('select');
                };
                
                // Add the one-time event handler
                this.canvas2d.on('mouse:down', addDeskChairHandler);
                console.log('Add desk with chair tool activated');
                break;
                
            case 'select':
                // Set canvas to selection mode
                this.canvas2d.selection = true;
                // Reset cursor
                document.body.style.cursor = 'default';
                // Remove any wall drawing event handlers
                this.cleanupWallDrawingHandlers();
                break;
                
            case 'add-wall':
                // Set canvas to non-selection mode for wall drawing
                this.canvas2d.selection = false;
                this.activeWallDrawing = true;
                
                // Setup wall drawing with first click handler
                this.setupWallDrawing();
                console.log('Add wall tool activated');
                break;
                
            case 'delete':
                // Set canvas to selection mode
                this.canvas2d.selection = true;
                // Set cursor to indicate delete mode
                document.body.style.cursor = 'url(images/delete-cursor.png), auto';
                
                // Set up click handler for deleting objects
                const deleteHandler = (e) => {
                    // Get the object under the cursor
                    const pointer = this.canvas2d.getPointer(e.e);
                    const objects = this.canvas2d.getObjects();
                    
                    // Find object at this position (in reverse order to get top-most)
                    for (let i = objects.length - 1; i >= 0; i--) {
                        const obj = objects[i];
                        if (obj.containsPoint(pointer)) {
                            // Remove from canvas
                            this.canvas2d.remove(obj);
                            
                            // Remove from objects array
                            if (obj.officeObject) {
                                const index = this.objects.indexOf(obj.officeObject);
                                if (index !== -1) {
                                    this.objects.splice(index, 1);
                                }
                            }
                            
                            break;
                        }
                    }
                };
                
                // Clear any existing handlers and add new one
                this.canvas2d.off('mouse:down');
                this.canvas2d.on('mouse:down', deleteHandler);
                
                console.log('Delete tool activated');
                break;
                
            default:
                console.log(`Unknown tool: ${toolName}`);
        }
    }
    
    /**
     * Cancel wall drawing in progress
     */
    cancelWallDrawing() {
        this.cleanupWallDrawingVisuals();
        this.wallDrawingStartPoint = null;
        this.cleanupWallDrawingHandlers();
        
        // Reset cursor
        document.body.style.cursor = 'default';
    }
    
    /**
     * Clean up all wall drawing visual elements (preview, markers, etc.)
     */
    cleanupWallDrawingVisuals() {
        if (!this.canvas2d) return;
        
        // Remove preview line
        if (this.wallDrawingPreview) {
            this.canvas2d.remove(this.wallDrawingPreview);
            this.wallDrawingPreview = null;
        }
        
        // Remove start marker
        if (this.wallDrawingStartMarker) {
            this.canvas2d.remove(this.wallDrawingStartMarker);
            this.wallDrawingStartMarker = null;
        }
        
        // Remove length text
        if (this.wallLengthText) {
            this.canvas2d.remove(this.wallLengthText);
            this.wallLengthText = null;
        }
        
        // Remove angle text
        if (this.angleText) {
            this.canvas2d.remove(this.angleText);
            this.angleText = null;
        }
        
        this.canvas2d.renderAll();
    }
    
    /**
     * Clean up wall drawing event handlers
     */
    cleanupWallDrawingHandlers() {
        if (!this.canvas2d) return;
        
        // Remove all possible event handlers
        if (this.firstClickHandler) {
            this.canvas2d.off('mouse:down', this.firstClickHandler);
        }
        
        if (this.wallPreviewHandler) {
            this.canvas2d.off('mouse:move', this.wallPreviewHandler);
        }
        
        if (this.secondClickHandler) {
            this.canvas2d.off('mouse:down', this.secondClickHandler);
        }
        
        // Remove key handlers
        if (this.snapToggleHandler) {
            document.removeEventListener('keydown', this.snapToggleHandler);
            document.removeEventListener('keyup', this.snapToggleHandler);
        }
    }
    
    /**
     * Set up wall drawing interaction with angle snapping
     */
    setupWallDrawing() {
        if (!this.canvas2d) return;
        
        // Create a cursor style for the wall drawing mode
        document.body.style.cursor = 'crosshair';
        
        // Clean up any existing handlers first
        this.cleanupWallDrawingHandlers();
        
        // Angle snap settings
        this.angleSnapEnabled = false; // Enable angle snapping by default
        this.angleSnapDegrees = 15; // Snap to multiples of 15 degrees
        
        // Mouse down handler for the first click (start point of wall)
        const firstClickHandler = (e) => {
            // Get coordinates in canvas space
            const pointer = this.canvas2d.getPointer(e.e);
            
            // Store the start point
            this.wallDrawingStartPoint = { x: pointer.x, y: pointer.y };
            
            // Add a marker at the start point for better visualization
            const startMarker = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 4,
                fill: '#1E88E5',
                stroke: '#FFFFFF',
                strokeWidth: 1,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            this.wallDrawingStartMarker = startMarker;
            this.canvas2d.add(startMarker);
            
            // Add live wall length indicator
            this.wallLengthText = new fabric.Text('', {
                fontSize: 12,
                fill: '#333',
                backgroundColor: 'rgba(255,255,255,0.7)',
                left: 0,
                top: 0,
                selectable: false,
                evented: false
            });
            this.canvas2d.add(this.wallLengthText);
            
            // Add angle indicator
            this.angleText = new fabric.Text('', {
                fontSize: 12,
                fill: '#333',
                backgroundColor: 'rgba(255,255,255,0.7)',
                left: 0,
                top: 0,
                selectable: false,
                evented: false
            });
            this.canvas2d.add(this.angleText);
            
            // Start tracking mouse movement for real-time preview
            this.canvas2d.on('mouse:move', this.wallPreviewHandler);
            
            // Set up handler for second click (end point of wall)
            this.canvas2d.on('mouse:down', this.secondClickHandler);
            
            // Add key handler for toggling snap (using Shift key)
            this.snapToggleHandler = (e) => {
                if (e.key === 'Shift') {
                    if (e.type === 'keydown') {
                        this.angleSnapEnabled = !this.angleSnapEnabled; // Toggle snap
                        
                        // Update the wall preview immediately
                        if (this.lastMouseMoveEvent) {
                            this.wallPreviewHandler(this.lastMouseMoveEvent);
                        }
                        
                        // Show a temporary notification about snap mode
                        this.showStatusMessage(
                            this.angleSnapEnabled ? 'Angle snap: ON (15°)' : 'Angle snap: OFF', 
                            1500
                        );
                    }
                }
            };
            
            // Register key events
            document.addEventListener('keydown', this.snapToggleHandler);
            document.addEventListener('keyup', this.snapToggleHandler);
            
            // Remove the first click handler to avoid multiple calls
            this.canvas2d.off('mouse:down', firstClickHandler);
        };
        
        // Handler for real-time wall preview during mouse movement
        this.wallPreviewHandler = (e) => {
            // Store the last mouse move event for refreshing when snap is toggled
            this.lastMouseMoveEvent = e;
            
            if (!this.wallDrawingStartPoint) return;
            
            // Get current pointer position
            const pointer = this.canvas2d.getPointer(e.e);
            
            // Calculate original angle in degrees
            let dx = pointer.x - this.wallDrawingStartPoint.x;
            let dy = pointer.y - this.wallDrawingStartPoint.y;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Calculate length
            let length = Math.sqrt(dx * dx + dy * dy);
            
            // Store original end point for reference
            let originalEndX = pointer.x;
            let originalEndY = pointer.y;

            this.angleSnapEnabled = this.keyboardCtrl;
            
            // Apply angle snapping if enabled
            if (this.angleSnapEnabled) {
                // Snap angle to nearest multiple of snap degree
                let snappedAngle = Math.round(angle / this.angleSnapDegrees) * this.angleSnapDegrees;
                
                // Convert back to radians for calculation
                let snappedRad = snappedAngle * (Math.PI / 180);
                
                // Calculate new end point based on snapped angle but preserving length
                originalEndX = this.wallDrawingStartPoint.x + Math.cos(snappedRad) * length;
                originalEndY = this.wallDrawingStartPoint.y + Math.sin(snappedRad) * length;
                
                // Update angle to snapped value for display
                angle = snappedAngle;
            }
            
            // Update length text
            if (this.wallLengthText) {
                const midX = (this.wallDrawingStartPoint.x + originalEndX) / 2;
                const midY = (this.wallDrawingStartPoint.y + originalEndY) / 2;
                
                this.wallLengthText.set({
                    text: `${Math.round(length)} px`,
                    left: midX,
                    top: midY - 15, // Position slightly above the line
                });
            }
            
            // Update angle text
            if (this.angleText) {
                // Format angle to show degrees symbol and no decimal places
                let formattedAngle = `${Math.round(angle)}°`;
                
                // Position angle text near the start point
                const textX = this.wallDrawingStartPoint.x + 20;
                const textY = this.wallDrawingStartPoint.y - 20;
                
                this.angleText.set({
                    text: formattedAngle,
                    left: textX,
                    top: textY,
                });
            }
            
            // Remove previous preview line if it exists
            if (this.wallDrawingPreview) {
                this.canvas2d.remove(this.wallDrawingPreview);
            }
            
            // Create new preview line
            this.wallDrawingPreview = new fabric.Line(
                [
                    this.wallDrawingStartPoint.x, 
                    this.wallDrawingStartPoint.y, 
                    originalEndX, 
                    originalEndY
                ],
                {
                    stroke: this.angleSnapEnabled ? '#1E88E5' : '#444', // Blue when snapping, dark grey otherwise
                    strokeWidth: 3,
                    selectable: false,
                    evented: false,
                    strokeDashArray: [5, 5], // Dashed line for preview
                }
            );
            
            // Add to canvas and render
            this.canvas2d.add(this.wallDrawingPreview);
            this.canvas2d.bringToFront(this.wallLengthText);
            this.canvas2d.bringToFront(this.angleText);
            this.canvas2d.renderAll();
        };
        
        // Handler for the second click (end point of wall)
        this.secondClickHandler = (e) => {
            // Get coordinates in canvas space
            const pointer = this.canvas2d.getPointer(e.e);
            
            // Calculate original values
            let dx = pointer.x - this.wallDrawingStartPoint.x;
            let dy = pointer.y - this.wallDrawingStartPoint.y;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            let length = Math.sqrt(dx * dx + dy * dy);

            // CHANGE: Check for Ctrl key to enable snapping
            this.angleSnapEnabled = this.keyboardCtrl;
            
            // Apply angle snapping if enabled
            let endX = pointer.x;
            let endY = pointer.y;
            
            if (this.angleSnapEnabled) {
                // Snap angle to nearest multiple of snap degree
                let snappedAngle = Math.round(angle / this.angleSnapDegrees) * this.angleSnapDegrees;
                
                // Convert back to radians for calculation
                let snappedRad = snappedAngle * (Math.PI / 180);
                
                // Calculate new end point based on snapped angle but preserving length
                endX = this.wallDrawingStartPoint.x + Math.cos(snappedRad) * length;
                endY = this.wallDrawingStartPoint.y + Math.sin(snappedRad) * length;
            }
            
            // Don't create wall if start and end points are too close
            const distSquared = Math.pow(endX - this.wallDrawingStartPoint.x, 2) + 
                            Math.pow(endY - this.wallDrawingStartPoint.y, 2);
            
            // Minimum distance threshold (e.g., 5 pixels)
            if (distSquared < 25) {
                console.log('Wall creation canceled: points too close');
                this.cancelWallDrawing();
                return;
            }
            
            // Clean up the preview and markers
            this.cleanupWallDrawingVisuals();
            
            // Create the actual wall
            this.addWall(
                'wall_' + Date.now(),
                this.wallDrawingStartPoint.x,
                this.wallDrawingStartPoint.y,
                endX,
                endY,
                { 
                    color: '#414141',
                    thickness: 10 // Consistent wall thickness
                }
            );
            
            // Reset and clean up
            this.wallDrawingStartPoint = null;
            this.cleanupWallDrawingHandlers();
            
            // Reset cursor
            document.body.style.cursor = 'default';
            
            // Switch back to select tool
            this.activateTool('select');
        };
        
        // Store reference to the handler for cleanup
        this.firstClickHandler = firstClickHandler;
        
        // Set up the first click handler
        this.canvas2d.on('mouse:down', this.firstClickHandler);
    }
    
    /**
     * Display a status message temporarily
     */
    showStatusMessage(message, duration = 2000) {
        if (!this.canvas2d) return;
        
        // If we already have a status message, remove it
        if (this.statusMessage) {
            this.canvas2d.remove(this.statusMessage);
        }
        
        // Create new status message
        this.statusMessage = new fabric.Text(message, {
            left: 20,
            top: 20,
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#333',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: 8,
            selectable: false,
            evented: false,
        });
        
        // Add to canvas
        this.canvas2d.add(this.statusMessage);
        this.canvas2d.bringToFront(this.statusMessage);
        this.canvas2d.renderAll();
        
        // Set timeout to remove the message
        if (this.statusMessageTimeout) {
            clearTimeout(this.statusMessageTimeout);
        }
        
        this.statusMessageTimeout = setTimeout(() => {
            if (this.statusMessage) {
                this.canvas2d.remove(this.statusMessage);
                this.statusMessage = null;
                this.canvas2d.renderAll();
            }
        }, duration);
    }
    
    /**
     * Zoom in on the canvas
     */
    zoomIn() {
        if (this.activeMode === '2d' && this.canvas2d) {
            const currentZoom = this.canvas2d.getZoom();
            const newZoom = Math.min(5, currentZoom * 1.1);
            this.canvas2d.setZoom(newZoom);
            this.canvas2d.renderAll();
        } else if (this.activeMode === '3d' && this.canvas3d) {
            this.canvas3d.zoomIn();
        }
    }
    
    /**
     * Zoom out on the canvas
     */
    zoomOut() {
        if (this.activeMode === '2d' && this.canvas2d) {
            const currentZoom = this.canvas2d.getZoom();
            const newZoom = Math.max(0.2, currentZoom * 0.9);
            this.canvas2d.setZoom(newZoom);
            this.canvas2d.renderAll();
        } else if (this.activeMode === '3d' && this.canvas3d) {
            this.canvas3d.zoomOut();
        }
    }
    
    /**
     * Reset the view to default
     */
    resetView() {
        if (this.activeMode === '2d' && this.canvas2d) {
            this.canvas2d.setZoom(1);
            this.canvas2d.setViewportTransform([1, 0, 0, 1, 0, 0]);
            this.canvas2d.renderAll();
        } else if (this.activeMode === '3d' && this.canvas3d) {
            this.canvas3d.resetCamera();
        }
    }
    
    /**
     * Save the current layout using the location manager
     */
    saveLayout() {
        try {
            if (this.locationManager && this.locationManager.selectedFloor) {
                // Use location manager to save layout for current floor
                this.locationManager.saveCurrentLayout();
            } else {
                this.showError('No floor selected. Please select a floor first.');
            }
        } catch (error) {
            console.error('Failed to save layout:', error);
            this.showError('Failed to save layout: ' + error.message);
        }
    }
    
    /**
     * Load a layout using the location manager
     */
    loadLayout() {
        try {
            if (this.locationManager && this.locationManager.selectedFloor) {
                // Use location manager to load layout for current floor
                this.locationManager.loadFloorLayout(this.locationManager.selectedFloor);
            } else {
                this.showError('No floor selected. Please select a floor first.');
            }
        } catch (error) {
            console.error('Failed to load layout:', error);
            this.showError('Failed to load layout: ' + error.message);
        }
    }
    
    /**
     * Load an SVG layout and set it as a background layer
     */
    loadSvgBackground() {
        if (this.fileUploadManager) {
            // Use the file upload manager if available
            this.fileUploadManager.uploadSvgFloorPlan();
        } else {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.svg';        
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    console.log('Selected file:', file);
        
                    const reader = new FileReader();
                    
                    reader.onload = (event) => {
                        const svgData = event.target.result;
                        
                        // Save to localStorage
                        this.saveSvgBackground(svgData);
                        
                        // Remove any existing background
                        if (this.svgBackground) {
                            this.canvas2d.remove(this.svgBackground);
                        }
                        
                        // Load the SVG into fabric
                        fabric.loadSVGFromString(svgData, (objects, options) => {
                            // Group the parsed SVG elements together
                            const svgGroup = fabric.util.groupSVGElements(objects, options);
                            
                            // Set properties on the group
                            svgGroup.set({
                                selectable: false,
                                evented: false,
                                opacity: 0.8
                            });
                            
                            // Store reference and add to canvas
                            this.svgBackground = svgGroup;
                            this.canvas2d.add(svgGroup);
                            this.canvas2d.sendToBack(svgGroup);
                            this.canvas2d.renderAll();
                        });
                    };
                    
                    reader.readAsText(file);
                }
            });
            
            // Trigger file selection dialog
            fileInput.click();
        }
    }
    
    /**
     * Save an SVG as the background layer to local storage
     * @param {string} svgData - SVG data as string
     */
    saveSvgBackground(svgData) {
        try {
            localStorage.setItem('layoutSvgBackground', svgData);
            console.log('SVG background saved to local storage');
            return true;
        } catch (error) {
            console.error('Failed to save SVG background:', error);
            return false;
        }
    }
    
    /**
     * Remove the SVG background
     */
    removeSvgBackground() {
        if (this.svgBackground && this.canvas2d) {
            this.canvas2d.remove(this.svgBackground);
            this.svgBackground = null;
            this.canvas2d.renderAll();
        }
        
        localStorage.removeItem('layoutSvgBackground');
        console.log('SVG background removed');
    }
    
    /**
     * Generate mock users for development
     */
    generateMockUsers() {
        const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Design'];
        const users = [];
        const localImageBasePath = 'https://randomuser.me/api/portraits/thumb/men/';
        
        // Generate 50 mock users
        for (let i = 1; i <= 50; i++) {
            const userId = `user${i}`;
            const firstName = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Alex', 'Emma', 'Chris', 'Anna'][i % 10];
            const lastName = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'][i % 10];
            const department = departments[i % departments.length];
            
            // Generate a profile photo URL using a placeholder service
            // Using i to ensure each user gets a unique image
            const photoUrl = `${localImageBasePath}${i}.jpg`;
            
            users.push({
                id: userId,
                name: `${firstName} ${lastName}`,
                displayName: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
                department,
                photoUrl
            });
        }
        
        return users;
    }
    
    // Helper functions for UI feedback
    
    showLoading(message = 'Loading...') {
        let loader = document.querySelector('.loading-indicator');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loading-indicator';
            loader.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            document.body.appendChild(loader);
        } else {
            loader.querySelector('.loading-message').textContent = message;
            loader.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loader = document.querySelector('.loading-indicator');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type = 'info') {
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Add appropriate styling
        switch (type) {
            case 'error':
                notification.style.backgroundColor = '#f44336';
                notification.style.color = 'white';
                break;
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'info':
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
                break;
        }
        
        // Position it
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '9999';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Create and initialize the application
window.app = new App();