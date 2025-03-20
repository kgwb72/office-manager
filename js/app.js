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
        
        // Wall drawing properties
        this.wallDrawingStartPoint = null;
        this.wallDrawingPreview = null;
        
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
        document.getElementById('add-desk').addEventListener('click', () => this.activateTool('add-desk'));
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
            // Add escape key to cancel wall drawing
            if(e.key === 'Escape' && this.wallDrawingStartPoint) {
                this.cancelWallDrawing();
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
     /**
     * Add a desk with chair to the canvas
     */
     addDeskWithChair(id, x, y, rotation = 0, options = {}) {
        // Create position and rotation objects
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        
        // Create the desk with chair object
        const deskWithChair = new DeskWithChair(id, position, rotationObj, options);
        
        // Create the fabric object and add to canvas
        deskWithChair.createFabricObject(this.canvas2d);
        
        console.log('Added desk with chair at:', x, y);
        return deskWithChair;
    }



    addDesk(id, x, y, rotation = 0, options = {}) {
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const deskWithChair = new Desk(id, position, rotationObj, options);
        deskWithChair.createFabricObject(this.canvas2d);
        return deskWithChair;
    }

    /**
     * Add a wall between two points
     */
    addWall(id, startX, startY, endX, endY, options = {}) {
        // Calculate wall dimensions and position
        const width = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)); // Length of the wall
        
        // Calculate the midpoint between start and end points for proper positioning
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Calculate rotation angle in degrees
        const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
        
        // Create wall object
        const position = { x: midX, y: 0, z: midY }; // Use midpoint for positioning
        const rotationObj = { x: 0, y: angle * Math.PI / 180, z: 0 };
        const thickness = options.thickness || 10; // Default wall thickness
        const color = options.color || '#e8e8e8'; // Default wall color
        const dimensions = { width: width, height: options.height || 250, depth: thickness };
        
        // Create and add the wall
        const wall = new Wall(id, position, rotationObj, dimensions, {
            ...options,
            thickness: thickness
        });
        
        wall.createFabricObject(this.canvas2d);
        
        // Add to objects array if not already tracking
        if (!this.objects.includes(wall)) {
            this.objects.push(wall);
        }
        
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
                const addDeskChairkHandler = (e) => {
                    // Get coordinates in canvas space
                    const pointer = this.canvas2d.getPointer(e.e);
                    
                    // Add desk at the pointer position
                    const deskWithChair = this.addDeskWithChair(
                        'desk_' + Date.now(), 
                        pointer.x, 
                        pointer.y
                    );
                    
                    // Add to objects array if not already tracking
                    if (this.objects && !this.objects.includes(deskWithChair)) {
                        this.objects.push(deskWithChair);
                    }
                    
                    // Remove this event handler after first use
                    this.canvas2d.off('mouse:down', addDeskChairkHandler);
                    
                    // Reset cursor
                    document.body.style.cursor = 'default';
                    
                    // Switch back to select tool
                    this.activateTool('select');
                };
                
                // Add the one-time event handler
                this.canvas2d.on('mouse:down', addDeskChairkHandler);
                console.log('Add desk tool activated');
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
                
                // Setup wall drawing with first click handler
                this.setupWallDrawing();
                console.log('Add wall tool activated');
                break;

            // Add more tools as needed
        }
    }

   
    
    /**
 * Set up wall drawing interaction with angle snapping
 */
    setupWallDrawing() {
        // Create a cursor style for the wall drawing mode
        document.body.style.cursor = 'crosshair';
        
        // Clean up any existing handlers first
        this.cleanupWallDrawingHandlers();
        
        // Angle snap settings
        this.angleSnapEnabled = true; // Enable angle snapping by default
        this.angleSnapDegrees = 15; // Snap to multiples of 15 degrees
        
        // Mouse down handler for the first click (start point of wall)
        const firstClickHandler = (e) => {
            // Get coordinates in canvas space
            const pointer = this.canvas2d.getPointer(e.e);
            
            // Store the start point
            this.wallDrawingStartPoint = { x: pointer.x, y: pointer.y };
            console.log('Wall drawing start point:', this.wallDrawingStartPoint);
            
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
     * Clean up wall drawing event handlers
     */
    cleanupWallDrawingHandlers() {
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
     * Cancel wall drawing in progress
     */
    cancelWallDrawing() {
        this.cleanupWallDrawingVisuals();
        this.wallDrawingStartPoint = null;
        this.cleanupWallDrawingHandlers();
        
        // Reset cursor
        document.body.style.cursor = 'default';
        
        // Clear last mouse move event
        this.lastMouseMoveEvent = null;
    }

    /**
     * Clean up all wall drawing visual elements (preview, markers, etc.)
     */
    cleanupWallDrawingVisuals() {
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
        
        // Remove status message if present
        if (this.statusMessage) {
            this.canvas2d.remove(this.statusMessage);
            this.statusMessage = null;
            if (this.statusMessageTimeout) {
                clearTimeout(this.statusMessageTimeout);
            }
        }
        
        this.canvas2d.renderAll();
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
     * Clean up wall drawing event handlers
     */
    cleanupWallDrawingHandlers() {
        this.canvas2d.off('mouse:move', this.wallPreviewHandler);
        this.canvas2d.off('mouse:down', this.secondClickHandler);
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