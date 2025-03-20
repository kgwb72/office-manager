class Canvas2D {
    constructor(canvasId) {
        const container = document.getElementById(canvasId).parentElement;
        const containerWidth = container.clientWidth || 800; // fallback to 800 if container width is 0
        const containerHeight = container.clientHeight || 600; // fallback to 600 if container height is 0
        
        this.canvas = new fabric.Canvas(canvasId, {
            width: containerWidth,
            height: containerHeight,
            backgroundColor: '#f5f5f5'
        });
        
        this.initialize();
    }
    
    initialize() {
        // Set up event listeners or any initial configuration
        this.canvas.selection = true; // Enable group selection
        this.canvas.on('selection:created', this.onSelectionCreated.bind(this));
        this.canvas.on('selection:updated', this.onSelectionUpdated.bind(this));
        this.canvas.on('selection:cleared', this.onSelectionCleared.bind(this));
    }
    
    // Event handlers
    onSelectionCreated(e) {
        console.log('Selection created', e);
    }
    
    onSelectionUpdated(e) {
        console.log('Selection updated', e);
    }
    
    onSelectionCleared(e) {
        console.log('Selection cleared', e);
    }
    
    // Drawing methods
    addDeskWithChair(id, x, y, rotation = 0, options = {}) {
        const position = { x, y, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const deskWithChair = new DeskWithChair(id, position, rotationObj, options);
        deskWithChair.createFabricObject(this.canvas);
        return deskWithChair;
    }
    
    addWall(id, x, y, width, height, rotation = 0, options = {}) {
        const position = { x, y: 0, z: y }; // Use y as z for 3D positioning
        const rotationObj = { x: 0, y: rotation * Math.PI / 180, z: 0 };
        const dimensions = { width, height: options.height || 250, depth: height };
        const wall = new Wall(id, position, rotationObj, dimensions, options);
        wall.createFabricObject(this.canvas);
        return wall;
    }
    
    addObject(objectType, id, params) {
        switch (objectType.toLowerCase()) {
            case 'deskwithchair':
                return this.addDeskWithChair(id, params.x, params.y, params.rotation, params.options);
            case 'wall':
                return this.addWall(id, params.x, params.y, params.width, params.height, params.rotation, params.options);
            default:
                console.error(`Unknown object type: ${objectType}`);
                return null;
        }
    }

    // Utility methods
    removeSelected() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach(obj => {
                this.canvas.remove(obj);
            });
            this.canvas.discardActiveObject();
            this.canvas.renderAll();
        }
    }
    
    clear() {
        this.canvas.clear();
    }
    
    toJSON() {
        return this.canvas.toJSON();
    }
    
    loadFromJSON(json) {
        this.canvas.loadFromJSON(json, () => {
            this.canvas.renderAll();
        });
    }
    
    setBackgroundColor(color) {
        this.canvas.setBackgroundColor(color, this.canvas.renderAll.bind(this.canvas));
    }
    
    getCanvas() {
        return this.canvas;
    }
}