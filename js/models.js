/**
 * Base class for all office objects that need 2D and 3D representations
 */
class OfficeObject {
  constructor(id, type, position, rotation, dimensions, options = {}) {
    this.id = id;
    this.type = type; // 'desk', 'chair', 'wall', etc.
    this.position = position; // { x, y, z }
    this.rotation = rotation; // { x, y, z }
    this.dimensions = dimensions; // { width, height, depth }
    this.options = options; // Additional options like color, material, etc.
    this.assignedUser = null; // For objects that can be assigned to users
    this.fabricObject = null; // Will hold the Fabric.js object
    this.threeObject = null; // Will hold the Three.js object      
    this.isSelected = false;
    this.isMoving = false;
  }
  
  // Create both 2D and 3D representations
  initialize(fabricCanvas, threeScene) {
    this.createFabricObject(fabricCanvas);
    this.createThreeObject(threeScene);
  }
  
  // To be implemented by subclasses
  createFabricObject(canvas) {      
    throw new Error('Method must be implemented by subclass');
  }
  
  // To be implemented by subclasses
  createThreeObject(scene) {
    throw new Error('Method must be implemented by subclass');
  }
  
  // Update 3D position based on 2D movement
  updateThreeFromFabric() {
    if (this.fabricObject && this.threeObject) {
      // Convert 2D coordinates to 3D
      this.threeObject.position.set(
        this.fabricObject.left - this.dimensions.width / 2, 
        0, // y in Three.js typically represents height
        this.fabricObject.top - this.dimensions.depth / 2
      );
      
      // Convert 2D rotation to 3D
      this.threeObject.rotation.y = -this.fabricObject.angle * Math.PI / 180;
    }
  }
  
  // Update 2D position based on 3D movement
  updateFabricFromThree() {
    if (this.fabricObject && this.threeObject) {
      // Convert 3D coordinates to 2D
      this.fabricObject.set({
        left: this.threeObject.position.x + this.dimensions.width / 2,
        top: this.threeObject.position.z + this.dimensions.depth / 2,
        angle: -this.threeObject.rotation.y * 180 / Math.PI
      });
      this.fabricObject.setCoords(); // Update corners for proper interaction
    }
  }
  
  // Assign a user to this object (e.g., a desk or chair)
  assignUser(user) {
    this.assignedUser = user;
    this.updateVisualState();
  }
  
  // Update visual appearance based on state (selected, assigned, etc.)
  updateVisualState() {
    // Base implementation - child classes should override this method
    const selectedColor = '#add8e6'; // Light blue
    const assignedColor = '#90ee90'; // Light green
    const defaultColor = this.options.color || '#cccccc';
    
    let color = defaultColor;
    if (this.isSelected) color = selectedColor;
    if (this.assignedUser) color = assignedColor;
    
    // Update Fabric.js object
    if (this.fabricObject) {
      if (this.fabricObject.fill !== undefined) {
        this.fabricObject.set('fill', color);
        if (this.fabricObject.canvas) {
          this.fabricObject.canvas.renderAll();
        }
      }
    }
    
    // Update Three.js object
    if (this.threeObject && this.threeObject.material) {
      this.threeObject.material.color.set(color);
    }
  }
  
  // Select this object
  select() {
    this.isSelected = true;
    this.updateVisualState();
  }
  
  // Deselect this object
  deselect() {
    this.isSelected = false;
    this.updateVisualState();
  }
  
  // Delete this object from both 2D and 3D representations
  remove(fabricCanvas, threeScene) {
    if (this.fabricObject && fabricCanvas) {
      fabricCanvas.remove(this.fabricObject);
    }
    
    if (this.threeObject && threeScene) {
      threeScene.remove(this.threeObject);
    }
  }
  
  // Get serializable data for saving layout
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      rotation: { ...this.rotation },
      dimensions: { ...this.dimensions },
      options: { ...this.options },
      assignedUser: this.assignedUser ? this.assignedUser.id || this.assignedUser : null
    };
  }
}

class Desk extends OfficeObject {
  constructor(id, position, rotation, options = {}) {
    // Default dimensions for desk
    const dimensions = {
      width: options.width || 160,  // desk width
      height: options.height || 75, // desk height
      depth: options.depth || 80,   // desk depth
    };
    
    super(id, 'desk', position, rotation, dimensions, options);
    
    this.deskColor = options.deskColor || '#8B4513'; // Brown by default
  }
  
  createFabricObject(canvas) {
    if (!canvas) return null;
    
    // Create desk (rectangle)
    const desk = new fabric.Rect({
      width: this.dimensions.width,
      height: this.dimensions.depth,  // Depth is used as height in 2D
      fill: this.deskColor,
      originX: 'center',
      originY: 'center'
    });
    
    // Group desk
    this.fabricObject = new fabric.Group([desk], {
      left: this.position.x,
      top: this.position.z,  // Use z for top position in 2D
      angle: this.rotation.y * (180 / Math.PI),
      hasControls: true,
      hasBorders: false,
      lockScalingX: true,
      lockScalingY: true,
      selectable: true,     
      transparentCorners: false
    });
    
    // Hide all controls except for rotation control
    this.fabricObject.setControlsVisibility({
      tl: false,
      tr: false,
      br: false,
      bl: false,
      ml: false,
      mt: false,
      mr: false,
      mb: false,
      mtr: true  // Only keep rotation control visible
    });
    
    // Add custom properties
    this.fabricObject.officeObject = this;
    
    // Add event listeners for position and rotation updates
    this.setupEventListeners();
    
    // Add to canvas
    canvas.add(this.fabricObject);
    
    return this.fabricObject;
  }
  
  setupEventListeners() {
    if (!this.fabricObject) return;
    
    // Moving event
    this.fabricObject.on('moving', () => {
      if (!this.fabricObject) return;
      
      // Update our position properties
      this.position.x = this.fabricObject.left;
      this.position.z = this.fabricObject.top;
      
      // Update 3D object if needed
      this.updateThreeFromFabric();
    });
    
    // Rotating event
    this.fabricObject.on('rotating', () => {
      if (!this.fabricObject) return;
      
      // Get the raw angle from fabric object        
      let angle = this.fabricObject.angle;
 
      // Update our rotation properties
      this.rotation.y = angle * (Math.PI / 180);
      
      // Update 3D object if needed
      this.updateThreeFromFabric();
    });

    // Mouse over event
    this.fabricObject.on('mouseover', () => {
      if (!this.fabricObject) return;
      
      // Apply hover effects
      this.fabricObject.set({
        opacity: 0.8,
        shadow: new fabric.Shadow({
          color: 'rgba(99, 132, 179, 0.7)',       
          blur: 15,
          offsetX: 0,
          offsetY: 0
        })
      });
      
      // Highlight 3D object if available
      this.setHovered(true);
      
      // Update canvas
      if (this.fabricObject.canvas) {
        this.fabricObject.canvas.renderAll();
      }
    });
    
    // Mouse out event
    this.fabricObject.on('mouseout', () => {
      if (!this.fabricObject) return;
      
      // Remove hover effects
      this.fabricObject.set({
        opacity: 1,
        shadow: null
      });
      
      // Remove highlight from 3D object
      this.setHovered(false);
      
      // Update canvas
      if (this.fabricObject.canvas) {
        this.fabricObject.canvas.renderAll();
      }
    });
    
    // Selection events
    this.fabricObject.on('selected', () => {
      this.select();
    });
    
    this.fabricObject.on('deselected', () => {
      this.deselect();
    });    

    // Delete event
    this.fabricObject.on('removed', () => {
      // Cleanup
      if (this.fabricObject && this.fabricObject.canvas) {
        this.remove(this.fabricObject.canvas, null);
      }
    });
  }
  
  createThreeObject(scene) {
    if (!scene) return null;
    
    const group = new THREE.Group();
    
    // Create desk (box)
    const deskGeometry = new THREE.BoxGeometry(
      this.dimensions.width, 
      this.dimensions.height, 
      this.dimensions.depth
    );
    const deskMaterial = new THREE.MeshPhongMaterial({ color: this.deskColor });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    
    // Position desk with its bottom at floor level
    desk.position.y = this.dimensions.height / 2;      
  
    // Add all components to the group
    group.add(desk);   
    
    // Position and rotate group
    group.position.set(this.position.x, this.position.y, this.position.z);
    group.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    
    // Store reference and add to scene
    this.threeObject = group;
    scene.add(group);
    
    // Add custom property for raycasting
    this.threeObject.officeObject = this;
    
    return this.threeObject;
  }
  
  // Custom method to highlight when hovered
  setHovered(isHovered) {
    if (this.threeObject) {
      // Traverse all children (desk parts)
      this.threeObject.traverse((child) => {
        if (child.isMesh) {
          if (isHovered) {
            child.material.emissive.set(0x555555);
          } else {
            child.material.emissive.set(0x000000);
          }
        }
      });
    }
  }
  
  // Override update visual state for desk-specific appearance updates
  updateVisualState() {
    const selectedColor = '#add8e6'; // Light blue
    const assignedColor = '#90ee90'; // Light green
    const deskColor = this.isSelected ? selectedColor : 
      (this.assignedUser ? assignedColor : this.deskColor);
    console.log('update visual state:',this.fabricObject);
    if (this.fabricObject) {
      
      // Find the desk rectangle in the group and update its color
      const deskObj = this.fabricObject.getObjects()[0];
      if (deskObj) {
        deskObj.set('fill', deskColor);
      }
      
      // Update canvas if available
      if (this.fabricObject.canvas) {
        this.fabricObject.canvas.renderAll();
      }
    }
    
    // Update 3D object if available
    if (this.threeObject) {
      this.threeObject.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(deskColor);
        }
      });
    }
  }
}

class DeskWithChair extends OfficeObject {
  constructor(id, position, rotation, options = {}) {
    // Default dimensions for desk with chair
    const dimensions = {
      width: options.width || 160,  // desk width
      height: options.height || 75, // desk height
      depth: options.depth || 80,   // desk depth
      chairWidth: options.chairWidth || 40,
      chairHeight: options.chairHeight || 45,
      chairDepth: options.chairDepth || 50
    };
    
    super(id, 'deskWithChair', position, rotation, dimensions, options);
    
    this.deskColor = options.deskColor || '#8B4513'; // Brown by default
    this.chairColor = options.chairColor || '#4169E1'; // Royal Blue by default
  }
  
  createFabricObject(canvas) {
    if (!canvas) return null;
    
    // Create desk (rectangle)
    const desk = new fabric.Rect({
      width: this.dimensions.width,
      height: this.dimensions.depth,  // Depth is used as height in 2D
      fill: this.deskColor,
      originX: 'center',
      originY: 'center'
    });
    
    // Create chair (circle)
    const chair = new fabric.Circle({
      radius: this.dimensions.chairWidth / 2,
      fill: this.assignedUser ? '#2ecc71' : this.chairColor, // Green if assigned, default if not
      originX: 'center',
      originY: 'center',
      top: this.dimensions.depth / 2 + 10  // Position chair below desk
    });

    const chairText = new fabric.Text('', {
      fontSize: Math.min(this.dimensions.chairWidth / 2, 14), // Scale font size based on chair size
      fill: 'white',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center',
      top: this.dimensions.depth / 2 + 10  // Position text at the same position as chair
    });
    
    // Group elements to be included
    const groupObjects = [desk, chair,chairText];
    
    // Add initials text if user is assigned
    if (this.assignedUser) {
      const initials = this.getInitials(this.assignedUser.name);
      chairText.set('text', initials);
      
    }
    
    // Create the group
    this.fabricObject = new fabric.Group(groupObjects, {
      left: this.position.x,
      top: this.position.z,  // Use z for top position in 2D
      angle: this.rotation.y * (180 / Math.PI),
      hasControls: true,
      hasBorders: false,
      lockScalingX: true,
      lockScalingY: true,
      selectable: true,     
      transparentCorners: false
    });

    // Hide all controls except for rotation control
    this.fabricObject.setControlsVisibility({
      tl: false,
      tr: false,
      br: false,
      bl: false,
      ml: false,
      mt: false,
      mr: false,
      mb: false,
      mtr: true  // Only keep rotation control visible
    });
    
    // Add custom properties
    this.fabricObject.officeObject = this;
    
    // Add event listeners for position and rotation updates
    this.setupEventListeners();
    
    // Add to canvas
    canvas.add(this.fabricObject);
    
    return this.fabricObject;
  }
  
  setupEventListeners() {
    if (!this.fabricObject) return;
    
    // Moving event
    this.fabricObject.on('moving', () => {
      if (!this.fabricObject) return;
      
      // Update our position properties
      this.position.x = this.fabricObject.left;
      this.position.z = this.fabricObject.top;
      
      // Update 3D object if needed
      this.updateThreeFromFabric();
    });
    
    // Rotating event
    this.fabricObject.on('rotating', () => {
      if (!this.fabricObject) return;
      
      // Get the raw angle from fabric object        
      let angle = this.fabricObject.angle;
      
      // Update our rotation properties
      this.rotation.y = angle * (Math.PI / 180);
      
      // Update 3D object if needed
      this.updateThreeFromFabric();
    });

    // Mouse over event
    this.fabricObject.on('mouseover', () => {
      if (!this.fabricObject) return;
      
      // Apply hover effects
      this.fabricObject.set({
        opacity: 0.8,
        shadow: new fabric.Shadow({
          color: 'rgba(99, 132, 179, 0.7)',       
          blur: 15,
          offsetX: 0,
          offsetY: 0
        })
      });
      
      // Highlight 3D object if available
      this.setHovered(true);
      
      // Update canvas
      if (this.fabricObject.canvas) {
        this.fabricObject.canvas.renderAll();
      }
    });
    
    // Mouse out event
    this.fabricObject.on('mouseout', () => {
      if (!this.fabricObject) return;
      
      // Remove hover effects
      this.fabricObject.set({
        opacity: 1,
        shadow: null
      });
      
      // Remove highlight from 3D object
      this.setHovered(false);
      
      // Update canvas
      if (this.fabricObject.canvas) {
        this.fabricObject.canvas.renderAll();
      }
    });
    
    // Selection events
    this.fabricObject.on('selected', () => {
      this.select();
    });
    
    this.fabricObject.on('deselected', () => {
      this.deselect();
    });    

    // Delete event
    this.fabricObject.on('removed', () => {
      // Cleanup
      if (this.fabricObject && this.fabricObject.canvas) {
        this.remove(this.fabricObject.canvas, null);
      }
    });
  }
  
  // Add a helper method to get initials from a name
  getInitials(name) {
    if (!name) return '';
    
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2); // Limit to 2 characters
  }
  
  createThreeObject(scene) {
    if (!scene) return null;
    
    const group = new THREE.Group();
    
    // Create desk (box)
    const deskGeometry = new THREE.BoxGeometry(
      this.dimensions.width, 
      this.dimensions.height, 
      this.dimensions.depth
    );
    const deskMaterial = new THREE.MeshPhongMaterial({ color: this.deskColor });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    
    // Position desk with its bottom at floor level
    desk.position.y = this.dimensions.height / 2;
    
    // Create chair (cylinder for seat + box for back)
    const seatGeometry = new THREE.CylinderGeometry(
      this.dimensions.chairWidth / 2,
      this.dimensions.chairWidth / 2,
      this.dimensions.chairHeight / 3,
      32
    );
    const chairMaterial = new THREE.MeshPhongMaterial({ 
      color: this.assignedUser ? '#2ecc71' : this.chairColor 
    });
    const seat = new THREE.Mesh(seatGeometry, chairMaterial);
    
    // Position chair seat
    seat.position.set(0, this.dimensions.chairHeight / 2, this.dimensions.depth / 2 + 25);
    
    // Create chair back
    const backGeometry = new THREE.BoxGeometry(
      this.dimensions.chairWidth,
      this.dimensions.chairHeight / 2,
      this.dimensions.chairDepth / 10
    );
    const back = new THREE.Mesh(backGeometry, chairMaterial);
    
    // Position chair back
    back.position.set(
      0, 
      this.dimensions.chairHeight, 
      this.dimensions.depth / 2 + 45
    );
    
    // Add all components to the group
    group.add(desk);
    group.add(seat);
    group.add(back);
    
    // Position and rotate group
    group.position.set(this.position.x, this.position.y, this.position.z);
    group.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    
    // Store reference and add to scene
    this.threeObject = group;
    scene.add(group);
    
    // Add custom property for raycasting
    this.threeObject.officeObject = this;
    
    return this.threeObject;
  }
  
  // Custom method to highlight when hovered
  setHovered(isHovered) {
    if (this.threeObject) {
      // Traverse all children (desk and chair parts)
      this.threeObject.traverse((child) => {
        if (child.isMesh) {
          if (isHovered) {
            child.material.emissive.set(0x555555);
          } else {
            child.material.emissive.set(0x000000);
          }
        }
      });
    }
  }
  
  // Override update visual state for desk-specific appearance updates
  updateVisualState() {
    // Instead of recreating the entire object, just update colors of the parts
    const selectedColor = '#add8e6'; // Light blue
    const assignedChairColor = '#2ecc71'; // Green
    const defaultDeskColor = this.deskColor;
    const defaultChairColor = this.chairColor;
    
    console.log('update visual state:',this.fabricObject);
    // Determine colors based on state
    const deskColor = this.isSelected ? selectedColor : defaultDeskColor;
    const chairColor = this.assignedUser ? assignedChairColor : defaultChairColor;
    
    if (this.fabricObject && this.fabricObject.getObjects) {
      const objects = this.fabricObject.getObjects();
      
      // Update desk color (first object in group)
      if (objects[0]) {
        objects[0].set('fill', deskColor);
      }
      
      // Update chair color (second object in group)
      if (objects[1]) {
        objects[1].set('fill', chairColor);
      }      
      
      // If user is assigned, make sure we have a text element for initials
      if (this.assignedUser) {
        const initials = this.getInitials(this.assignedUser.name);        
       
          objects[2].set('text', initials);          
          
        
      } else {
        // Remove text element if no user is assigned       
          objects[2].set('text', '');         
      }
      
      // Ensure canvas is updated
      if (this.fabricObject.canvas) {
        this.fabricObject.canvas.renderAll();
      }
    }
    
    // Update 3D object if available
    if (this.threeObject) {
      // Update materials for desk and chair parts
      this.threeObject.traverse((child) => {
        if (child.isMesh) {
          // First child is desk, others are chair parts
          if (child === this.threeObject.children[0]) {
            child.material.color.set(deskColor);
          } else {
            child.material.color.set(chairColor);
          }
        }
      });
    }
  }
}

class Wall extends OfficeObject {
  constructor(id, position, rotation, dimensions, options = {}) {
      super(id, 'wall', position, rotation, dimensions, options);
      this.wallColor = options.color || '#414141'; // Light gray by default
      this.wallThickness = options.thickness || 10; // Default wall thickness
      this.wallOpacity = options.opacity || 1.0; // Default opacity
      
      this.endpoints = [];
      this.updateEndpoints();
  }

  updateEndpoints() {
    if (!this.position) return;
    
    // Calculate endpoints based on position, dimension, and rotation
    const halfWidth = this.dimensions.width / 2;
    const halfDepth = this.dimensions.depth / 2;
    const angle = this.rotation.y;
    
    // Define corners relative to center (clockwise from top-left)
    const corners = [
      { x: -halfWidth, y: -halfDepth },
      { x: halfWidth, y: -halfDepth },
      { x: halfWidth, y: halfDepth },
      { x: -halfWidth, y: halfDepth }
    ];
    
    // Transform corners based on rotation and position
    this.endpoints = corners.map(corner => {
      // Apply rotation
      const rotatedX = corner.x * Math.cos(angle) - corner.y * Math.sin(angle);
      const rotatedY = corner.x * Math.sin(angle) + corner.y * Math.cos(angle);
      
      // Apply position offset
      return {
        x: rotatedX + this.position.x,
        y: rotatedY + this.position.z, // Use z for 2D top
        z: this.position.y // Include z coordinate for 3D calculations
      };
    });
    
    // Store wall line segment (for collision detection)
    this.wallLine = {
      start: this.endpoints[0],
      end: this.endpoints[1]
    };
  }
  
  createFabricObject(canvas) {
      if (!canvas) return null;
      
      // Create wall as rectangle
      this.fabricObject = new fabric.Rect({
          left: this.position.x,
          top: this.position.z,
          width: this.dimensions.width,
          height: this.dimensions.depth || this.wallThickness, // Using depth as height in 2D view
          fill: this.wallColor,
          opacity: this.wallOpacity,
          originX: 'center', // Set origin to center
          originY: 'center', // Set origin to center
          angle: this.rotation.y * (180 / Math.PI),
          hasControls: true,
          hasBorders: true,
          lockScalingY: true, // Lock the thickness/height of the wall
          selectable: true,
          cornerColor: '#38A3D8', // Blue corner handles
          cornerSize: 8,
          transparentCorners: false,
          snapAngle: 15, // Snap rotation to 15-degree increments when Ctrl is pressed
          snapThreshold: 10 // Snap threshold in degrees
      });
      
      // Add custom property
      this.fabricObject.officeObject = this;
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Add to canvas
      canvas.add(this.fabricObject);
      
      return this.fabricObject;
  }
  
  setupEventListeners() {
      if (!this.fabricObject) return;
      
      // Moving event
      this.fabricObject.on('moving', () => {
          if (!this.fabricObject) return;
          
          // Update our position properties
          this.position.x = this.fabricObject.left;
          this.position.z = this.fabricObject.top;
          
          // Update endpoints
          this.updateEndpoints();
          
          // Update 3D object if needed
          this.updateThreeFromFabric();
      });
      
      // Rotating event
      this.fabricObject.on('rotating', () => {
          if (!this.fabricObject) return;
          
          // Handle angle snapping if Ctrl is pressed
          const appInstance = window.app;
          if (appInstance && appInstance.keyboardCtrl) {
              const snapAngle = this.fabricObject.snapAngle || 15;
              const targetAngle = Math.round(this.fabricObject.angle / snapAngle) * snapAngle;
              this.fabricObject.angle = targetAngle;
          }
          
          // Update our rotation properties
          this.rotation.y = this.fabricObject.angle * (Math.PI / 180);

          // Update endpoints and 3D object
          this.updateEndpoints();
          this.updateThreeFromFabric();
      });
      
      // Scaling event
      this.fabricObject.on('scaling', () => {
          if (!this.fabricObject) return;
          
          // Only allow scaling of width (length of wall), not height (thickness)
          this.dimensions.width = this.fabricObject.width * this.fabricObject.scaleX;
          
          // Update endpoints and 3D object
          this.updateEndpoints();
          this.updateThreeFromFabric();
          
          // Reset scaling factors to avoid compounding
          this.fabricObject.set({
              width: this.dimensions.width,
              scaleX: 1,
              scaleY: 1
          });
          
          // Ensure canvas is updated
          if (this.fabricObject.canvas) {
              this.fabricObject.canvas.renderAll();
          }
      });
      
      // Mouse over event
      this.fabricObject.on('mouseover', () => {
          if (!this.fabricObject) return;
          
          // Apply hover effects
          this.fabricObject.set({
              opacity: Math.min(this.wallOpacity + 0.1, 1.0),
              shadow: new fabric.Shadow({
                  color: 'rgba(99, 132, 179, 0.7)',       
                  blur: 15,
                  offsetX: 0,
                  offsetY: 0
              })
          });
          
          // Update canvas
          if (this.fabricObject.canvas) {
              this.fabricObject.canvas.renderAll();
          }
      });
      
      // Mouse out event
      this.fabricObject.on('mouseout', () => {
          if (!this.fabricObject) return;
          
          // Remove hover effects
          this.fabricObject.set({
              opacity: this.wallOpacity,
              shadow: null
          });
          
          // Update canvas
          if (this.fabricObject.canvas) {
              this.fabricObject.canvas.renderAll();
          }
      });
      
      // Selection events
      this.fabricObject.on('selected', () => {
          this.select();
      });
      
      this.fabricObject.on('deselected', () => {
          this.deselect();
      });

      // Delete event
      this.fabricObject.on('removed', () => {
          // Cleanup
          if (this.fabricObject && this.fabricObject.canvas) {
              this.remove(this.fabricObject.canvas, null);
          }
      });
  }
  
  // Update visual appearance based on state
  updateVisualState() {
      const selectedColor = '#93c5fd'; // Light blue for walls
      const defaultColor = this.wallColor;
      
      const color = this.isSelected ? selectedColor : defaultColor;
      
      if (this.fabricObject) {
          this.fabricObject.set({
              fill: color
          });
          
          // Update canvas if available
          if (this.fabricObject.canvas) {
              this.fabricObject.canvas.renderAll();
          }
      }
      
      // Update 3D object if available
      if (this.threeObject) {
          this.threeObject.traverse((child) => {
              if (child.isMesh) {
                  child.material.color.set(color);
              }
          });
      }
  }
  
  // Create 3D representation
  createThreeObject(scene) {
      if (!scene) return null;
      
      // Create a box geometry for the wall
      const geometry = new THREE.BoxGeometry(
          this.dimensions.width,
          this.dimensions.height,
          this.dimensions.depth
      );
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
          color: this.wallColor,
          roughness: 0.7,
          metalness: 0.2
      });
      
      // Create mesh
      const wall = new THREE.Mesh(geometry, material);
      
      // Position the wall
      wall.position.set(this.position.x, this.dimensions.height / 2, this.position.z);
      
      // Apply rotation
      wall.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
      
      // Enable shadows
      wall.castShadow = true;
      wall.receiveShadow = true;
      
      // Add reference to this object
      wall.officeObject = this;
      
      // Store reference
      this.threeObject = wall;
      
      // Add to scene
      scene.add(wall);
      
      return wall;
  }
}

class OfficeObjectFactory {
  static createObject(type, id, position, rotation, options = {}) {
      switch (type.toLowerCase()) {
          case 'desk':
              return new Desk(id, position, rotation, options);
          case 'deskwithchair':
              return new DeskWithChair(id, position, rotation, options);
          case 'wall':
              const dimensions = {
                  width: options.width || 100,
                  height: options.height || 250,
                  depth: options.thickness || 10
              };
              return new Wall(id, position, rotation, dimensions, options);
          case 'room':
              return new Room(id, position, rotation, options);
          default:
              throw new Error(`Unknown object type: ${type}`);
      }
  }
}

// Room class for grouping related objects
class Room extends OfficeObject {
    constructor(id, position, rotation, options = {}) {
        const dimensions = {
            width: options.width || 400,
            height: options.height || 250,
            depth: options.depth || 400
        };
        
        super(id, 'room', position, rotation, dimensions, options);
        
        this.name = options.name || 'Room';
        this.type = options.type || 'office'; // office, meeting, utility, etc.
        this.capacity = options.capacity || 1;
        this.department = options.department || null;
        this.objects = []; // Objects contained in this room
    }
    
    // Room-specific methods can be added here
}

class User {
  constructor(id, name, email, department, photoUrl) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.department = department;
    this.photoUrl = photoUrl;
    this.assignedObject = null; // Reference to assigned desk or chair
  }
}