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
    
    //Update visual appearance based on state (selected, assigned, etc.)
    // updateVisualState() {
    //   const selectedColor = '#add8e6'; // Light blue
    //   const assignedColor = '#90ee90'; // Light green
    //   const defaultColor = this.options.color || '#cccccc';
      
    //   let color = defaultColor;
    //   if (this.isSelected) color = selectedColor;
    //   if (this.assignedUser) color = assignedColor;
      
    //   // Update Fabric.js object
    //   if (this.fabricObject) {
    //     this.fabricObject.set('fill', color);
    //     this.fabricObject.canvas?.renderAll();
    //   }
      
    //   // Update Three.js object
    //   if (this.threeObject && this.threeObject.material) {
    //     this.threeObject.material.color.set(color);
    //   }
    // }
    // In models.js

// Override the base class updateVisualState method
  updateVisualState() {
    // Instead of calling super.updateVisualState(), implement what we need directly
    const selectedColor = '#add8e6'; // Light blue
    const assignedColor = '#90ee90'; // Light green
    const defaultDeskColor = this.options.deskColor || '#8B4513';
    const defaultChairColor = this.options.chairColor || '#4169E1';
    
    // Determine colors based on state
    let deskColor = defaultDeskColor;
    let chairColor = this.assignedUser ? '#2ecc71' : defaultChairColor; // Green if assigned
    
    if (this.isSelected) {
      deskColor = selectedColor;
    }
    
    // If we have a fabric object, update its appearance
    if (this.fabricObject) {
      // We need to update the desk and chair colors and add/remove initials text
      // Since fabric.Group doesn't allow direct modification of its children,
      // we need to recreate the group
      
      const oldLeft = this.fabricObject.left;
      const oldTop = this.fabricObject.top;
      const oldAngle = this.fabricObject.angle;
      const oldCanvas = this.fabricObject.canvas;
      
      // Remove old object
      if (oldCanvas) {
        oldCanvas.remove(this.fabricObject);
      }
      
      // Update position and rotation from the old object
      this.position.x = oldLeft;
      this.position.z = oldTop;
      this.rotation.y = oldAngle * (Math.PI / 180);
      
      // Store the old colors temporarily
      const oldDeskColor = this.deskColor;
      const oldChairColor = this.chairColor;
      
      // Update colors
      this.deskColor = deskColor;
      this.chairColor = chairColor;
      
      // Create new object
      if (oldCanvas) {
        this.createFabricObject(oldCanvas);
      }
      
      // Restore original colors (so they're not permanently changed)
      this.deskColor = oldDeskColor;
      this.chairColor = oldChairColor;
    }
    
    // Update Three.js object if it exists
    if (this.threeObject) {
      // Update 3D object colors
      this.threeObject.traverse((child) => {
        if (child.isMesh) {
          // Update mesh materials here...
        }
      });
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
      // Default dimensions for desk with chair
      const dimensions = {
        width: options.width || 160,  // desk width
        height: options.height || 75, // desk height
        depth: options.depth || 80,   // desk depth
       
      };
      
      super(id, 'desk', position, rotation, dimensions, options);
      
      this.deskColor = options.deskColor || '#8B4513'; // Brown by default
      this.chairColor = options.chairColor || '#4169E1'; // Royal Blue by default
    }
    
    createFabricObject(canvas) {
      // Create desk (rectangle)
      const desk = new fabric.Rect({
        width: this.dimensions.width,
        height: this.dimensions.depth,  // Depth is used as height in 2D
        fill: this.deskColor,
        originX: 'center',
        originY: 'center'
      });
      
     
      // Group desk and chair
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
      
      // Add event listeners
      this.fabricObject.on('moving', () => {
        this.position.x = this.fabricObject.left;
        this.position.z = this.fabricObject.top;
        this.updateThreeFromFabric();
      });
      
      this.fabricObject.on('rotating', () => {
        // Get the raw angle from fabric object        
        let angle = this.fabricObject.angle;
   
        // Convert to radians for the 3D object
        this.fabricObject.angle = angle;
        this.rotation.y = angle * (Math.PI / 180);
        this.updateThreeFromFabric();
      });

      this.fabricObject.on('mouseover', () => {
        // Store original origin point
        const origOriginX = this.fabricObject.originX;
        const origOriginY = this.fabricObject.originY;
        
        // Set origin to center for scaling from center
        this.fabricObject.set({
          originX: 'center',
          originY: 'center',
          // scaleX: 1.1,
          // scaleY: 1.1,
          opacity: 0.8,
          shadow: new fabric.Shadow({
        color: 'rgba(99, 132, 179, 0.7)',       
        blur: 15,
        offsetX: 0,
        offsetY: 0
          })
        });
        
        // Reset origin to original values
        this.fabricObject.set({
          originX: origOriginX,
          originY: origOriginY
        });
        
        // Highlight object
        this.setHovered(true);
        
        this.fabricObject.canvas?.renderAll();
      });
      
      this.fabricObject.on('mouseout', () => {
        // Store original origin point
        const origOriginX = this.fabricObject.originX;
        const origOriginY = this.fabricObject.originY;
        
        // Set origin to center for scaling from center
        this.fabricObject.set({
          originX: 'center',
          originY: 'center',
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          shadow: null
        });
        
        // Reset origin to original values
        this.fabricObject.set({
          originX: origOriginX,
          originY: origOriginY
        });
        
        // Remove highlight
        this.setHovered(false);
        
        this.fabricObject.canvas?.renderAll();
      });
      
      this.fabricObject.on('selected', () => {
        this.select();
      });
      
      this.fabricObject.on('deselected', () => {
        this.deselect();
      });    

      this.fabricObject.on('deleted', () => {
        // Remove from scene
        this.remove(canvas, null);
      });
      // Add to canvas
      canvas.add(this.fabricObject);
      return this.fabricObject;
    }
    
    createThreeObject(scene) {
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
        chairDepth: options.chairDepth || 50,

      };
      
      super(id, 'deskWithChair', position, rotation, dimensions, options);
      
      this.deskColor = options.deskColor || '#8B4513'; // Brown by default
      this.chairColor = options.chairColor || '#4169E1'; // Royal Blue by default
    }
    
    createFabricObject(canvas) {
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
      
      // Group elements to be included
      const groupObjects = [desk, chair];
      
      // Add initials text if user is assigned
      if (this.assignedUser) {
        const initials = this.getInitials(this.assignedUser.name);
        const chairText = new fabric.Text(initials, {
          fontSize: Math.min(this.dimensions.chairWidth / 2, 14), // Scale font size based on chair size
          fill: 'white',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
          top: this.dimensions.depth / 2 + 10  // Position text at the same position as chair
        });
        groupObjects.push(chairText);
      }
      
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
      
      // Add event listeners
      this.fabricObject.on('moving', () => {
        this.position.x = this.fabricObject.left;
        this.position.z = this.fabricObject.top;
        this.updateThreeFromFabric();
      });
      
      this.fabricObject.on('rotating', () => {
        // Get the raw angle from fabric object        
        let angle = this.fabricObject.angle;
    
        // Convert to radians for the 3D object
        this.fabricObject.angle = angle;
        this.rotation.y = angle * (Math.PI / 180);
        this.updateThreeFromFabric();
      });
    
      this.fabricObject.on('mouseover', () => {
        // Store original origin point
        const origOriginX = this.fabricObject.originX;
        const origOriginY = this.fabricObject.originY;
        
        // Set origin to center for scaling from center
        this.fabricObject.set({
          originX: 'center',
          originY: 'center',
          opacity: 0.8,
          shadow: new fabric.Shadow({
            color: 'rgba(99, 132, 179, 0.7)',       
            blur: 15,
            offsetX: 0,
            offsetY: 0
          })
        });
        
        // Reset origin to original values
        this.fabricObject.set({
          originX: origOriginX,
          originY: origOriginY
        });
        
        // Highlight object
        this.setHovered(true);
        
        this.fabricObject.canvas?.renderAll();
      });
      
      this.fabricObject.on('mouseout', () => {
        // Store original origin point
        const origOriginX = this.fabricObject.originX;
        const origOriginY = this.fabricObject.originY;
        
        // Set origin to center for scaling from center
        this.fabricObject.set({
          originX: 'center',
          originY: 'center',
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          shadow: null
        });
        
        // Reset origin to original values
        this.fabricObject.set({
          originX: origOriginX,
          originY: origOriginY
        });
        
        // Remove highlight
        this.setHovered(false);
        
        this.fabricObject.canvas?.renderAll();
      });
      
      this.fabricObject.on('selected', () => {
        this.select();
      });
      
      this.fabricObject.on('deselected', () => {
        this.deselect();
      });    
    
      this.fabricObject.on('deleted', () => {
        // Remove from scene
        this.remove(canvas, null);
      });
      
      // Add to canvas
      canvas.add(this.fabricObject);
      return this.fabricObject;
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
      const chairMaterial = new THREE.MeshPhongMaterial({ color: this.chairColor });
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
      // Calculate endpoints based on position, dimension, and rotation
      const halfWidth = this.dimensions.width / 2;
      const halfDepth = this.dimensions.depth / 2;
      const angle = this.rotation.y;
      
      // Define corners relative to center
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
          y: rotatedY + this.position.z // Use z for 2D top
        };
      });
    }
    
    createFabricObject(canvas) {
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
        
        // Add event listeners
        this.fabricObject.on('moving', () => {
            this.position.x = this.fabricObject.left;
            this.position.z = this.fabricObject.top;
            this.updateThreeFromFabric();

            this.updateEndpoints();
        });
        
        this.fabricObject.on('rotating', () => {
          const appInstance = window.app;
          if (appInstance && appInstance.keyboardCtrl) {
            const snapAngle = this.fabricObject.snapAngle || 15;
            const targetAngle = Math.round(this.fabricObject.angle / snapAngle) * snapAngle;
            this.fabricObject.angle = targetAngle;
          }
            this.rotation.y = this.fabricObject.angle * (Math.PI / 180);

            this.updateEndpoints();
            this.updateThreeFromFabric();
        });
        
        this.fabricObject.on('scaling', () => {
            // Only allow scaling of width (length of wall), not height (thickness)
            this.dimensions.width = this.fabricObject.width * this.fabricObject.scaleX;
            this.updateThreeFromFabric();
            
            // Reset scaling factors to avoid compounding
            this.fabricObject.set({
                width: this.dimensions.width,
                scaleX: 1,
                scaleY: 1
            });
        });
        
        // Add hover effects similar to desk
        this.fabricObject.on('mouseover', () => {
            // Store original origin point
            const origOriginX = this.fabricObject.originX;
            const origOriginY = this.fabricObject.originY;
            
            // Set origin to center for scaling from center
            this.fabricObject.set({
                originX: 'center',
                originY: 'center',
                opacity: Math.min(this.wallOpacity + 0.1, 1.0),
                shadow: new fabric.Shadow({
                    color: 'rgba(99, 132, 179, 0.7)',       
                    blur: 15,
                    offsetX: 0,
                    offsetY: 0
                })
            });
            
            // Reset origin to original values
            this.fabricObject.set({
                originX: origOriginX,
                originY: origOriginY
            });
            
            this.fabricObject.canvas?.renderAll();
        });
        
        this.fabricObject.on('mouseout', () => {
            // Store original origin point
            const origOriginX = this.fabricObject.originX;
            const origOriginY = this.fabricObject.originY;
            
            // Set origin to center for scaling from center
            this.fabricObject.set({
                originX: 'center',
                originY: 'center',
                opacity: this.wallOpacity,
                shadow: null
            });
            
            // Reset origin to original values
            this.fabricObject.set({
                originX: origOriginX,
                originY: origOriginY
            });
            
            this.fabricObject.canvas?.renderAll();
        });
        
        this.fabricObject.on('selected', () => {
            this.select();
        });
        
        this.fabricObject.on('deselected', () => {
            this.deselect();
        });

        this.fabricObject.on('deleted', () => {
            // Remove from scene
            this.remove(canvas, null);
        });
        
        // Add to canvas
        canvas.add(this.fabricObject);
        return this.fabricObject;
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

  // Add a Room class for grouping related objects
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
      
      // Additional methods for room-specific functionality...
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