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
    init() {
        try {
            console.log('Initializing Office Manager application...');
            
            // Initialize canvases
            this.initializeCanvases();
            
            // Initialize services
            this.initializeServices();            

            // Set up event listeners for UI controls
            this.setupEventListeners();
            
            // Generate mock data for development
            this.generateMockUsers();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }
    
    /**
     * Initialize application services
     */
    initializeServices() {
        // Initialize auth service
        this.authService = new AuthService();

        // Add event listeners for login/logout buttons
        document.getElementById('login-button').addEventListener('click', () => {
            this.authService.login().then(user => {
                if (user) {
                    console.log('User logged in:', user);
                    // You may want to reload or update data based on the logged-in user
                }
            });
        });
        
        document.getElementById('logout-button').addEventListener('click', () => {
            this.authService.logout().then(() => {
                console.log('User logged out');
                // You may want to clear user-specific data
            });
        });
        
        // Initialize server data service
        this.serverData = new ServerDataService();
        
        // Set up authentication token if user is logged in
        if (this.authService.currentUser) {
            this.authService.getUserInfo().then(userInfo => {
                if (userInfo && userInfo.accessToken) {
                    this.serverData.setAuthToken(userInfo.accessToken);
                }
            });
        }
        
        // Initialize panorama viewer (if container exists)
        const panoramaContainer = document.getElementById('panorama-container');
        if (panoramaContainer) {
            this.panoramaViewer = new PanoramaViewer('panorama-container');
        }
        
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
        if (document.getElementById('toggle-360')) {
            document.getElementById('toggle-360').addEventListener('click', () => this.setActiveMode('360'));
        }
        
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
        document.getElementById('canvas-2d').addEventListener('wheel', (e) => this.handleMouseWheel(e), { passive: false });
    }

    /**
     * Set up canvas object event handlers
     */
    setupCanvasObjectEventHandlers() {
        // Object moving event handler
        this.canvas2d.on('object:moving', (e) => {
            const obj = e.target;
            
            if (!obj) return;
            
            // Handle wall endpoint snapping during movement
            if (obj.type === 'rect' && obj.officeObject && obj.officeObject.type === 'wall') {
                this.handleWallMovementSnapping(obj);
            }
            
            // Handle object-to-wall snapping
            if (obj.officeObject && (obj.officeObject.type === 'desk' || obj.officeObject.type === 'deskWithChair')) {
                this.handleObjectToWallSnapping(obj);
            }
            
            // Apply grid snapping if Ctrl is pressed (for all objects)
            if (this.keyboardCtrl) {
                this.snapObjectToGrid(obj);
            }
        });
        
        // Object rotation event handler
        this.canvas2d.on('object:rotating', (e) => {
            const obj = e.target;
            
            // Only apply to furniture objects
            if (obj.officeObject && (obj.officeObject.type === 'desk' || obj.officeObject.type === 'deskWithChair')) {
                if (this.checkObjectWallCollision(obj)) {
                    // Revert to previous rotation if collision detected
                    obj.angle = obj.lastRotation || 0;
                    this.canvas2d.renderAll();
                } else {
                    // Store last valid rotation
                    obj.lastRotation = obj.angle;
                }
            }
        });

        // Object modification event handler
        this.canvas2d.on('object:modified', (e) => {
            const obj = e.target;
            if (!obj) return;
            
            // Perform final position checks and adjustments
            if (obj.officeObject && (obj.officeObject.type === 'desk' || obj.officeObject.type === 'deskWithChair')) {
                // If object still collides with walls after modification, move it to last valid position
                if (this.checkObjectWallCollision(obj)) {
                    obj.set({
                        left: obj.lastValidLeft || obj.left,
                        top: obj.lastValidTop || obj.top
                    });
                    this.canvas2d.renderAll();
                }
            }
        });

        // Mouse move for wall drawing
        this.canvas2d.on('mouse:move', (e) => {
            if (this.drawingWall && this.startPoint && this.tempWall) {
                const pointer = this.canvas2d.getPointer(e.e);
                
                // Try to snap to nearby wall endpoints
                const snappedPoint = this.keyboardCtrl ? 
                    this.findNearestWallEndpoint(pointer) : pointer;
                
                // Calculate width and height based on start and current point
                const width = Math.abs(snappedPoint.x - this.startPoint.x);
                const height = Math.abs(snappedPoint.y - this.startPoint.y);
                
                // Determine if wall is horizontal or vertical based on which dimension is larger
                let isHorizontal = width > height;
                
                if (isHorizontal) {
                    // For horizontal wall, keep height fixed and adjust width
                    this.tempWall.set({
                        width: width,
                        height: 10, // Fixed height for horizontal wall
                        left: Math.min(this.startPoint.x, snappedPoint.x) + width/2,
                        top: this.startPoint.y
                    });
                } else {
                    // For vertical wall, keep width fixed and adjust height
                    this.tempWall.set({
                        width: 10, // Fixed width for vertical wall
                        height: height,
                        left: this.startPoint.x,
                        top: Math.min(this.startPoint.y, snappedPoint.y) + height/2
                    });
                }
                
                this.canvas2d.renderAll();
            }
        });

        // Mouse down for wall drawing start
        this.canvas2d.on('mouse:down', (e) => {
            if (this.activeWallDrawing && !this.drawingWall) {
                const pointer = this.canvas2d.getPointer(e.e);
                
                // Try to snap to wall endpoints if Ctrl is pressed
                const snappedPoint = this.keyboardCtrl ? 
                    this.findNearestWallEndpoint(pointer) : pointer;
                
                this.startPoint = { x: snappedPoint.x, y: snappedPoint.y };
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
            }
        });

        // Mouse up for wall drawing end
        this.canvas2d.on('mouse:up', (e) => {
            if (this.drawingWall && this.startPoint && this.tempWall) {
                const pointer = this.canvas2d.getPointer(e.e);
                
                // Try to snap to wall endpoints if Ctrl is pressed
                const endPoint = this.keyboardCtrl ? 
                    this.findNearestWallEndpoint(pointer) : pointer;
                
                // Remove the temporary visual wall
                this.canvas2d.remove(this.tempWall);
                
                // Calculate width and height
                const width = Math.abs(endPoint.x - this.startPoint.x);
                const height = Math.abs(endPoint.y - this.startPoint.y);
                
                // Only create wall if it has some meaningful size
                if (width > 5 || height > 5) {
                    // Determine if wall is horizontal or vertical based on which dimension is larger
                    const isHorizontal = width > height;
                    
                    if (isHorizontal) {
                        // Create a horizontal wall
                        this.addWall(
                            'wall_' + Date.now(),
                            Math.min(this.startPoint.x, endPoint.x) + width/2,
                            this.startPoint.y,
                            width,
                            10 // Fixed height for horizontal wall
                        );
                    } else {
                        // Create a vertical wall
                        this.addWall(
                            'wall_' + Date.now(), 
                            this.startPoint.x,
                            Math.min(this.startPoint.y, endPoint.y) + height/2,
                            10, // Fixed width for vertical wall
                            height
                        );
                    }
                }
                
                // Reset drawing state
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
            
            if(e.key === 'Delete') { 
                const activeObjects = this.canvas2d.getActiveObjects();                
                activeObjects.forEach(obj => {
                    this.canvas2d.remove(obj);
                });            
            }
            
            if(e.key === 'Escape' && this.drawingWall) {
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
     * Find the nearest wall endpoint within snapping threshold
     * @param {Object} point - The current pointer position {x, y}
     * @returns {Object} The snapped point or original point if no snap
     */
    findNearestWallEndpoint(point) {
        const walls = this.canvas2d.getObjects().filter(obj => 
            obj.officeObject && obj.officeObject.type === 'wall'
        );
        
        let nearestPoint = { x: point.x, y: point.y };
        let minDistance = this.snapThreshold;
        
        walls.forEach(wall => {
            // Get the wall's coordinates
            const wallLeft = wall.left;
            const wallTop = wall.top;
            const wallWidth = wall.width * wall.scaleX;
            const wallHeight = wall.height * wall.scaleY;
            const angle = wall.angle * (Math.PI / 180);
            
            // Calculate the four corners of the wall
            const halfWidth = wallWidth / 2;
            const halfHeight = wallHeight / 2;
            
            // Define corners relative to center
            const corners = [
                { x: -halfWidth, y: -halfHeight },
                { x: halfWidth, y: -halfHeight },
                { x: halfWidth, y: halfHeight },
                { x: -halfWidth, y: halfHeight }
            ];
            
            // Transform corners based on rotation and position
            corners.forEach(corner => {
                // Apply rotation
                const rotatedX = corner.x * Math.cos(angle) - corner.y * Math.sin(angle);
                const rotatedY = corner.x * Math.sin(angle) + corner.y * Math.cos(angle);
                
                // Apply position offset
                const worldX = rotatedX + wallLeft;
                const worldY = rotatedY + wallTop;
                
                // Calculate distance to this corner
                const distance = Math.sqrt(
                    Math.pow(point.x - worldX, 2) + 
                    Math.pow(point.y - worldY, 2)
                );
                
                // If this corner is closer than our current nearest, update
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = { x: worldX, y: worldY };
                }
            });
        });
        
        return nearestPoint;
    }
    
    /**
     * Handle wall endpoint snapping during movement
     * @param {fabric.Object} wall - The wall being moved
     */
    handleWallMovementSnapping(wall) {
        if (!this.keyboardCtrl || !this.wallToWallSnap) return;
        
        // Get all other walls to snap to
        const otherWalls = this.canvas2d.getObjects().filter(obj => 
            obj !== wall && obj.officeObject && obj.officeObject.type === 'wall'
        );
        
        if (otherWalls.length === 0) return;
        
        // Calculate the four corners of the moving wall
        const wallLeft = wall.left;
        const wallTop = wall.top;
        const wallWidth = wall.width * wall.scaleX;
        const wallHeight = wall.height * wall.scaleY;
        const angle = wall.angle * (Math.PI / 180);
        
        // Define corners relative to center
        const halfWidth = wallWidth / 2;
        const halfHeight = wallHeight / 2;
        
        const corners = [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight }
        ];
        
        // Transform corners based on rotation and position
        const worldCorners = corners.map(corner => {
            // Apply rotation
            const rotatedX = corner.x * Math.cos(angle) - corner.y * Math.sin(angle);
            const rotatedY = corner.x * Math.sin(angle) + corner.y * Math.cos(angle);
            
            // Apply position offset
            return {
                x: rotatedX + wallLeft,
                y: rotatedY + wallTop
            };
        });
        
        // Check each corner of moving wall against each corner of other walls
        let bestSnapDistance = this.snapThreshold;
        let bestSnapDelta = { x: 0, y: 0 };
        
        worldCorners.forEach(movingCorner => {
            otherWalls.forEach(otherWall => {
                // Calculate corners of the other wall
                const otherLeft = otherWall.left;
                const otherTop = otherWall.top;
                const otherWidth = otherWall.width * otherWall.scaleX;
                const otherHeight = otherWall.height * otherWall.scaleY;
                const otherAngle = otherWall.angle * (Math.PI / 180);
                
                // Define corners relative to center
                const otherHalfWidth = otherWidth / 2;
                const otherHalfHeight = otherHeight / 2;
                
                const otherCorners = [
                    { x: -otherHalfWidth, y: -otherHalfHeight },
                    { x: otherHalfWidth, y: -otherHalfHeight },
                    { x: otherHalfWidth, y: otherHalfHeight },
                    { x: -otherHalfWidth, y: otherHalfHeight }
                ];
                
                // Transform corners based on rotation and position
                otherCorners.forEach(otherCorner => {
                    // Apply rotation
                    const rotatedX = otherCorner.x * Math.cos(otherAngle) - otherCorner.y * Math.sin(otherAngle);
                    const rotatedY = otherCorner.x * Math.sin(otherAngle) + otherCorner.y * Math.cos(otherAngle);
                    
                    // Apply position offset
                    const worldX = rotatedX + otherLeft;
                    const worldY = rotatedY + otherTop;
                    
                    // Calculate distance between corners
                    const dx = movingCorner.x - worldX;
                    const dy = movingCorner.y - worldY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // If this corner is within snap threshold and closer than previous best
                    if (distance < bestSnapDistance) {
                        bestSnapDistance = distance;
                        bestSnapDelta = { x: dx, y: dy };
                    }
                });
            });
        });
        
        // Apply the snap if we found a good match
        if (bestSnapDistance < this.snapThreshold) {
            wall.set({
                left: wall.left - bestSnapDelta.x,
                top: wall.top - bestSnapDelta.y
            });
            
            // Show visual feedback
            this.showSnapFeedback(wall.left, wall.top);
        }
    }
    
    /**
     * Handle object-to-wall snapping
     * @param {fabric.Object} obj - The object being moved
     */
    handleObjectToWallSnapping(obj) {
        if (!this.keyboardCtrl || !this.objectToWallSnap) return;
        
        // Get all walls for snapping and collision detection
        const walls = this.canvas2d.getObjects().filter(w => 
            w.officeObject && w.officeObject.type === 'wall'
        );
        
        if (walls.length === 0) return;
        
        // Store the current position as potentially valid
        obj.lastValidLeft = obj.left;
        obj.lastValidTop = obj.top;
        
        // Check for collision with walls
        if (this.checkObjectWallCollision(obj)) {
            // If collision detected, push object away from wall
            this.pushObjectFromWalls(obj, walls);
        } else {
            // No collision, try to snap to nearby walls
            this.snapObjectToNearbyWalls(obj, walls);
        }
    }
    
    /**
     * Check if an object collides with any wall
     * @param {fabric.Object} obj - The object to check
     * @returns {boolean} True if collision detected
     */
    checkObjectWallCollision(obj) {
        // Get the object's bounding box in world coordinates
        const objBounds = obj.getBoundingRect();
        
        // Get all walls
        const walls = this.canvas2d.getObjects().filter(w => 
            w.officeObject && w.officeObject.type === 'wall'
        );
        
        // Check intersection with each wall
        for (const wall of walls) {
            const wallBounds = wall.getBoundingRect();
            
            // Simple rectangular intersection check
            if (this.rectanglesIntersect(objBounds, wallBounds)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if two rectangles intersect
     * @param {Object} rect1 - First rectangle {left, top, width, height}
     * @param {Object} rect2 - Second rectangle {left, top, width, height}
     * @returns {boolean} True if rectangles intersect
     */
    rectanglesIntersect(rect1, rect2) {
        return !(
            rect1.left + rect1.width < rect2.left ||
            rect2.left + rect2.width < rect1.left ||
            rect1.top + rect1.height < rect2.top ||
            rect2.top + rect2.height < rect1.top
        );
    }
    
    /**
     * Push an object away from intersecting walls
     * @param {fabric.Object} obj - The object to adjust
     * @param {Array} walls - The walls to check against
     */
    pushObjectFromWalls(obj, walls) {
        const objBounds = obj.getBoundingRect();
        let adjustX = 0;
        let adjustY = 0;
        
        walls.forEach(wall => {
            const wallBounds = wall.getBoundingRect();
            
            if (this.rectanglesIntersect(objBounds, wallBounds)) {
                // Calculate overlap on each axis
                const overlapLeft = objBounds.left + objBounds.width - wallBounds.left;
                const overlapRight = wallBounds.left + wallBounds.width - objBounds.left;
                const overlapTop = objBounds.top + objBounds.height - wallBounds.top;
                const overlapBottom = wallBounds.top + wallBounds.height - objBounds.top;
                
                // Find the smallest overlap
                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);
                
                // Push in the direction of smallest overlap
                if (minOverlapX < minOverlapY) {
                    // Push horizontally
                    if (overlapLeft < overlapRight) {
                        adjustX = Math.min(adjustX, -overlapLeft);
                    } else {
                        adjustX = Math.max(adjustX, overlapRight);
                    }
                } else {
                    // Push vertically
                    if (overlapTop < overlapBottom) {
                        adjustY = Math.min(adjustY, -overlapTop);
                    } else {
                        adjustY = Math.max(adjustY, overlapBottom);
                    }
                }
            }
        });
        
        // Apply the adjustments
        if (adjustX !== 0 || adjustY !== 0) {
            obj.set({
                left: obj.left + adjustX,
                top: obj.top + adjustY
            });
            
            // Update the canvas
            this.canvas2d.renderAll();
        }
    }
    
    /**
     * Snap an object to nearby walls
     * @param {fabric.Object} obj - The object to snap
     * @param {Array} walls - The walls to snap to
     */
    snapObjectToNearbyWalls(obj, walls) {
        const objBounds = obj.getBoundingRect();
        let bestSnapDistance = this.snapThreshold;
        let bestSnapPosition = null;
        
        walls.forEach(wall => {
            const wallBounds = wall.getBoundingRect();
            
            // Check each edge of the object against each edge of the wall
            // Here we're focusing on aligning the object with the wall
            
            // Object right edge to wall left edge
            const distRightToLeft = Math.abs(objBounds.left + objBounds.width - wallBounds.left);
            if (distRightToLeft < bestSnapDistance && 
                this.verticalOverlap(objBounds, wallBounds)) {
                bestSnapDistance = distRightToLeft;
                bestSnapPosition = {
                    left: wallBounds.left - objBounds.width + (obj.left - objBounds.left),
                    top: obj.top
                };
            }
            
            // Object left edge to wall right edge
            const distLeftToRight = Math.abs(objBounds.left - (wallBounds.left + wallBounds.width));
            if (distLeftToRight < bestSnapDistance && 
                this.verticalOverlap(objBounds, wallBounds)) {
                bestSnapDistance = distLeftToRight;
                bestSnapPosition = {
                    left: wallBounds.left + wallBounds.width + (obj.left - objBounds.left),
                    top: obj.top
                };
            }
            
            // Object bottom edge to wall top edge
            const distBottomToTop = Math.abs(objBounds.top + objBounds.height - wallBounds.top);
            if (distBottomToTop < bestSnapDistance && 
                this.horizontalOverlap(objBounds, wallBounds)) {
                bestSnapDistance = distBottomToTop;
                bestSnapPosition = {
                    left: obj.left,
                    top: wallBounds.top - objBounds.height + (obj.top - objBounds.top)
                };
            }
            
            // Object top edge to wall bottom edge
            const distTopToBottom = Math.abs(objBounds.top - (wallBounds.top + wallBounds.height));
            if (distTopToBottom < bestSnapDistance && 
                this.horizontalOverlap(objBounds, wallBounds)) {
                bestSnapDistance = distTopToBottom;
                bestSnapPosition = {
                    left: obj.left,
                    top: wallBounds.top + wallBounds.height + (obj.top - objBounds.top)
                };
            }
        });
        
        // Apply the best snap position if found
        if (bestSnapPosition) {
            obj.set(bestSnapPosition);
            this.showSnapFeedback(bestSnapPosition.left, bestSnapPosition.top);
            
            // Update the canvas
            this.canvas2d.renderAll();
        }
    }
    
    /**
     * Check if two rectangles overlap vertically
     * @param {Object} rect1 - First rectangle
     * @param {Object} rect2 - Second rectangle
     * @returns {boolean} True if rectangles overlap vertically
     */
    verticalOverlap(rect1, rect2) {
        return !(
            rect1.top + rect1.height <= rect2.top ||
            rect2.top + rect2.height <= rect1.top
        );
    }
    
    /**
     * Check if two rectangles overlap horizontally
     * @param {Object} rect1 - First rectangle
     * @param {Object} rect2 - Second rectangle
     * @returns {boolean} True if rectangles overlap horizontally
     */
    horizontalOverlap(rect1, rect2) {
        return !(
            rect1.left + rect1.width <= rect2.left ||
            rect2.left + rect2.width <= rect1.left
        );
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
     * Add a desk with chair to the canvas
     */
    addDeskWithChair(id, x, y, rotation = 0, options = {}) {
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const deskWithChair = new DeskWithChair(id, position, rotationObj, options);
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
    }

    /**
     * Add a desk to the canvas
     */
    addDesk(id, x, y, rotation = 0, options = {}) {
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const desk = new Desk(id, position, rotationObj, options);
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
    }

    /**
     * Add a wall to the canvas
     */
    addWall(id, startX, startY, width, height, options = {}) {
        // Determine if this is a point-to-point wall drawing or dimensions-based
        let position, dimensions;
        
        if (typeof width === 'number' && typeof height === 'number') {
            // Dimensions-based wall
            position = { x: startX, y: 0, z: startY };
            dimensions = { 
                width: width,
                height: options.height || 250, 
                depth: height 
            };
        } else {
            // Point-to-point wall drawing (endX = width, endY = height)
            const endX = width;
            const endY = height;
            
            // Calculate wall dimensions and position
            const wallWidth = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            
            // Calculate the midpoint between start and end points for proper positioning
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            // Calculate rotation angle in degrees
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
            
            position = { x: midX, y: 0, z: midY };
            dimensions = { 
                width: wallWidth,
                height: options.height || 250, 
                depth: options.thickness || 10 
            };
            options.angle = angle;
        }
        
        // Create wall
        const rotationObj = { 
            x: 0, 
            y: (options.angle || 0) * Math.PI / 180, 
            z: 0 
        };
        
        const wallOptions = {
            ...options,
            thickness: options.thickness || 10,
            color: options.color || '#e8e8e8'
        };
        
        // Create and add the wall
        const wall = new Wall(id, position, rotationObj, dimensions, wallOptions);
        wall.createFabricObject(this.canvas2d);
        
        // Add to objects array if not already tracking
        if (!this.objects.includes(wall)) {
            this.objects.push(wall);
        }
        
        return wall;
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
                        'desk_' + Date.now(), 
                        x, 
                        y
                    );
                    
                    // Add to objects array if not already tracking
                    if (this.objects && !this.objects.includes(deskWithChair)) {
                        this.objects.push(deskWithChair);
                    }
                    
                    // Check for collision with walls
                    const fabricObj = deskWithChair.fabricObject;
                    if (fabricObj && this.checkObjectWallCollision(fabricObj)) {
                        this.canvas2d.remove(fabricObj);
                        this.objects.pop(); // Remove from objects array
                        
                        // Show error feedback
                        this.showPlacementError(x, y);
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

            // Add more tools as needed
        }
    }
    
    /**
     * Show error indicator when object can't be placed
     */
    showPlacementError(x, y) {
        // Create a temporary error indicator
        const errorIndicator = new fabric.Circle({
            left: x - 15,
            top: y - 15,
            radius: 15,
            fill: 'rgba(255, 0, 0, 0.5)',
            stroke: 'rgba(255, 0, 0, 0.8)',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        
        this.canvas2d.add(errorIndicator);
        
        // Add a cross inside
        const line1 = new fabric.Line([x-10, y-10, x+10, y+10], {
            stroke: 'rgba(255, 0, 0, 0.8)',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        
        const line2 = new fabric.Line([x+10, y-10, x-10, y+10], {
            stroke: 'rgba(255, 0, 0, 0.8)',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        
        this.canvas2d.add(line1);
        this.canvas2d.add(line2);
        
        // Remove after a short delay
        setTimeout(() => {
            this.canvas2d.remove(errorIndicator, line1, line2);
            this.canvas2d.renderAll();
        }, 800);
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
            if (this.locationManager && this.locationManager.selectedFloor) {
                // Use location manager to save layout for current floor
                this.locationManager.saveCurrentLayout();
            } else {
                // Fallback to local storage
                const layout = {
                    objects: this.objects.map(obj => obj.toJSON()),
                    timestamp: new Date().toISOString()
                };
                
                localStorage.setItem('savedLayout', JSON.stringify(layout));
                console.log('Layout saved locally');
                alert('Layout saved successfully');
            }
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
            if (this.locationManager && this.locationManager.selectedFloor) {
                // Use location manager to load layout for current floor
                this.locationManager.loadFloorLayout(this.locationManager.selectedFloor);
            } else {
                // Fallback to local storage
                const savedLayout = localStorage.getItem('savedLayout');
                if (!savedLayout) {
                    alert('No saved layout found');
                    return;
                }
                
                const layoutData = JSON.parse(savedLayout);
                
                // Clear existing objects
                this.canvas2d.clear();
                this.objects = [];
                
                // Create objects from layout data
                layoutData.objects.forEach(obj => {
                    const position = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
                    const rotation = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };
                    const options = obj.options || {};
                    
                    // Create the object based on type
                    if (obj.type === 'wall') {
                        this.addWall(
                            obj.id,
                            position.x,
                            position.z,
                            obj.dimensions.width,
                            obj.dimensions.depth,
                            { 
                                ...options,
                                angle: rotation.y * (180 / Math.PI)
                            }
                        );
                    } else if (obj.type === 'desk') {
                        this.addDesk(
                            obj.id,
                            position.x,
                            position.z,
                            rotation.y * (180 / Math.PI),
                            options
                        );
                    } else if (obj.type === 'deskWithChair') {
                        this.addDeskWithChair(
                            obj.id,
                            position.x,
                            position.z,
                            rotation.y * (180 / Math.PI),
                            options
                        );
                    }
                });
                
                console.log('Layout loaded');
                alert('Layout loaded successfully');
            }
        } catch (error) {
            console.error('Failed to load layout:', error);
            alert('Failed to load layout: ' + error.message);
        }
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
            
            users.push(new User(
                userId,
                `${firstName} ${lastName}`,
                `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
                department,
                photoUrl
            ));
        }
        
        this.users = users;
        console.log('Generated mock users:', users.length);
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
        if (this.svgBackground) {
            this.canvas2d.remove(this.svgBackground);
            this.svgBackground = null;
        }
        
        localStorage.removeItem('layoutSvgBackground');
        console.log('SVG background removed');
    }
}

// Create and initialize the application
window.app = new App();