/**
 * Main Application Controller
 * Handles initialization and coordination between different parts of the application
 */
class App {
    constructor() {
        // Core properties
        let keyboardCtrl = false;
        this.canvas2d = null;
        this.canvas3d = null;
        this.activeMode = '2d'; // Default to 2D mode
        this.selectedObject = null;
        this.objects = []; // Store all office objects
        
        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', () => this.init());
    }
    
    /**
     * Initialize the application
     */
    init() {
        try {
            console.log('Initializing Office Manager application...');
            
            // Initialize canvases
            this.initializeCanvases();
            
            // this.loadSvgBackground();
            // Set up event listeners for UI controls
            this.setupEventListeners();
            this.generateMockUsers();
            
            // Add a sample desk with chair to demonstrate functionality
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }
    
    /**
     * Initialize the 2D and 3D canvases
     */
    initializeCanvases() {
        // Initialize 2D canvas using Fabric.js
        const canvas2dElement = document.getElementById('canvas-2d');
        if (!canvas2dElement) throw new Error("Canvas 2D element not found");
        
        this.canvas2d = new fabric.Canvas('canvas-2d');


        
        // Get the canvas wrapper dimensions and set the canvas size accordingly
        const canvasWrapper = document.getElementById('canvas-wrapper');
        const wrapperWidth = canvasWrapper.clientWidth;
        const wrapperHeight = canvasWrapper.clientHeight;
        
        // Set canvas dimensions to fit the wrapper
        this.canvas2d.setWidth(wrapperWidth || 800);
        this.canvas2d.setHeight(wrapperHeight || 600);
        
        // Setup 3D canvas - we'll just initialize a placeholder for now
        this.canvas3dElement = document.getElementById('canvas-3d-container');
        
        console.log('Canvases initialized');
    }
    
    /**
     * Set up event listeners for UI controls
     */
    setupEventListeners() {
        // View toggle buttons
        document.getElementById('toggle-2d').addEventListener('click', () => this.setActiveMode('2d'));
        document.getElementById('toggle-3d').addEventListener('click', () => this.setActiveMode('3d'));
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        
        // Tool buttons
        document.getElementById('add-seat-desk').addEventListener('click', () => this.activateTool('add-seat-desk'));
        document.getElementById('select-tool').addEventListener('click', () => this.activateTool('select'));
        document.getElementById('add-wall').addEventListener('click', () => this.activateTool('add-wall'));
        
        // Layout saving/loading
        document.getElementById('save-layout').addEventListener('click', () => this.saveLayout());
        document.getElementById('load-layout').addEventListener('click', () => this.loadLayout());

        // In your setupEventListeners() function, add:
        document.getElementById('upload-svg-bg').addEventListener('click', () => this.loadSvgBackground());
        document.getElementById('remove-svg-bg').addEventListener('click', () => this.removeSvgBackground());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control') {
              this.keyboardCtrl = true;
            }
            if(e.key === 'Delete' ){ 
                const activeObjects  = this.canvas2d.getActiveObjects();                
                activeObjects.forEach(obj => {
                    this.canvas2d.remove(obj);
                });            
            }
            console.log('Key pressed:', this.keyboardCtrl, e.key); 
    });
          
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
              this.keyboardCtrl = false;
            }
        });
        
        console.log('Event listeners set up');
        
        // Add wheel event listener to the canvas element
        document.getElementById('canvas-2d').addEventListener('wheel', (e) => this.handleMouseWheel(e), { passive: false });
    }
    
    /**
     * Convert screen coordinates to canvas world coordinates
     */
    screenToWorld(screenX, screenY) {
        const canvas = document.getElementById('canvas-2d');
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
     * Add a sample desk with chair to the canvas
     */
    

    addDeskWithChair(id, x, y, rotation = 0, options = {}) {
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const deskWithChair = new DeskWithChair(id, position, rotationObj, options);
        deskWithChair.createFabricObject(this.canvas2d);
        return deskWithChair;
    }

    addWall(id, x, y, width, height, rotation = 0, options = {}) {
        const position = { x, y: 0, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const dimensions = { width, height: options.height || 250, depth: height };
        const wall = new Wall(id, position, rotationObj, dimensions, options);
        wall.createFabricObject(this.canvas2d);
        return wall;
    }
    
    /**
     * Set the active viewing mode (2D or 3D)
     */
    setActiveMode(mode) {
        if (mode !== '2d' && mode !== '3d') return;
        
        this.activeMode = mode;
        
        // Update UI
        document.getElementById('toggle-2d').classList.toggle('active', mode === '2d');
        document.getElementById('toggle-3d').classList.toggle('active', mode === '3d');
        
        // Show/hide appropriate canvas
        document.getElementById('canvas-2d').classList.toggle('active', mode === '2d');
        document.getElementById('canvas-3d-container').classList.toggle('active', mode === '3d');
        
        console.log(`View mode switched to ${mode}`);
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
        
        // Handle tool-specific logic
        switch (toolName) {
            case 'add-seat-desk':
                // Create a one-time event handler for mouse:down
                const addDeskHandler = (e) => {
                    console.log('Mouse down event:', e);
                    this.addDeskWithChair('desk_' + Date.now(), e.e.offsetX, e.e.offsetY);
                    // Remove this event handler after first use
                    this.canvas2d.off('mouse:down', addDeskHandler);
                    // Switch back to select tool
                    this.activateTool('select');
                };
                
                // Add the one-time event handler
                this.canvas2d.on('mouse:down', addDeskHandler);
                console.log('Add desk tool activated', toolName);
                break;
            case 'select':
                // Set canvas to selection mode
                this.canvas2d.selection = true;
                break;
            case 'add-wall':
                // Create a one-time event handler for mouse:down
                const addWallHandler = (e) => {
                    console.log('Mouse down event:', e);
                    this.addWall('wall_' + Date.now(), e.e.offsetX, e.e.offsetY, 100, 50);
                    // Remove this event handler after first use
                    this.canvas2d.off('mouse:down', addWallHandler);
                    // Switch back to select tool
                    this.activateTool('select');
                };
                
                // Add the one-time event handler
                this.canvas2d.on('mouse:down', addWallHandler);
                console.log('Add wall tool activated');
                break;

            // Add more tools as needed
        }
    }
    
    /**
     * Zoom in on the canvas
     */
    zoomIn() {
        if (this.activeMode === '2d' && this.canvas2d) {
            this.canvas2d.setZoom(this.canvas2d.getZoom() * 1.1);
        }
        // TODO: Add 3D zoom when implemented
    }
    
    /**
     * Zoom out on the canvas
     */
    zoomOut() {
        if (this.activeMode === '2d' && this.canvas2d) {
            this.canvas2d.setZoom(this.canvas2d.getZoom() * 0.9);
        }
        // TODO: Add 3D zoom when implemented
    }
    
    /**
     * Reset the view to default
     */
    resetView() {
        if (this.activeMode === '2d' && this.canvas2d) {
            this.canvas2d.setZoom(1);
            this.canvas2d.setViewportTransform([1, 0, 0, 1, 0, 0]);
        }
        // TODO: Add 3D reset when implemented
    }
    
    /**
     * Save the current layout
     */
    saveLayout() {
        try {
            const layout = {
                objects: this.objects.map(obj => obj.toJSON()),
                timestamp: new Date().toISOString()
            };
            
            // Save to localStorage for now
            localStorage.setItem('savedLayout', JSON.stringify(layout));
            
            console.log('Layout saved');
            alert('Layout saved successfully');
        } catch (error) {
            console.error('Failed to save layout:', error);
            alert('Failed to save layout: ' + error.message);
        }
    }
    
    /**
     * Load a previously saved layout
     */
    loadLayout() {
        try {
            const savedLayout = localStorage.getItem('savedLayout');
            if (!savedLayout) {
                alert('No saved layout found');
                return;
            }
            
            // TODO: Implement layout loading logic
            console.log('Layout loaded');
            alert('Layout loading not yet implemented');
        } catch (error) {
            console.error('Failed to load layout:', error);
            alert('Failed to load layout: ' + error.message);
        }
    }
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
            
            // console.log(photoUrl);
            
            users.push(new User(
                userId,
                `${firstName} ${lastName}`,
                `${firstName.toLowerCase()}.${lastName.toLowerCase()}@zaunergroup.com`,
                department,
                photoUrl
            ));
        }
        
        return users;
    }
    /**
 * Load an SVG layout from local storage and set it as a background layer
 */
    loadSvgBackground() {
        

        const svgUrl = localStorage.getItem[0];
        console.log(svgUrl);
  
        fetch(svgUrl)
            .then(response => {
            if (!response.ok) {
                throw new Error('Network error while fetching SVG');
            }
            return response.text();
            })
            .then(svgData => {
            // Load the SVG into Fabric from its string content
            fabric.loadSVGFromString(svgData, (objects, options) => {
                // Group the parsed SVG elements together
                const svgGroup = fabric.util.groupSVGElements(objects, options);
                
                // Optionally, you can set properties on the group (e.g., non-interactive)
                svgGroup.set({
                selectable: false,
                evented: false,
                opacity: 0.8 // or any desired opacity
                });
                
                // Add the group to your Fabric canvas
                canvas.add(svgGroup);
                canvas.renderAll();
            });
            })
            .catch(error => console.error('Failed to load SVG:', error));
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
     * Upload an SVG file and set it as a background
     */
    uploadSvgBackground() {
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
                    
                    // Load the new background
                    this.loadSvgBackground();
                };
                
                reader.readAsText(file);
            }
        });
        
        // Trigger file selection dialog
        fileInput.click();
    }

    /**
     * Remove the SVG background
     */
    removeSvgBackground() {
        if (this.svgBackground) {
            this.canvas2d.remove(this.svgBackground);
            this.svgBackground = null;
        }
        
        localStorage.removeItem('layoutSvgBackground');
        console.log('SVG background removed');
    }
}


// Create and initialize the application
const app = new App();