'use strict';

/**
 * Controllers
 */

angular.module('fabricApp.controllers', [])

/**
 * Main FabricJs Controller
 *
 * @TODO: Working with username is bad, replace with id
 */
.controller('HomeCtrl', function($scope, $location, commonData, socketFactory) {
    
    var homeCtrl = this;
    
    if (commonData.Name === '') {
        $location.path('/');
        return;
    }
    else {
        socketFactory.emit('setUser', commonData.Name);
    }

    homeCtrl.getEditorBubble = function(username) {
        return $('div[data-user-id="'+username+'"]');
    };
    
    /**
     * Get FabricJs Object by Id
     */
    homeCtrl.getObjectById = function(id) {
        
        for(var i = 0; i < $scope.objList.length; i++) {
            if ($scope.objList[i].id === id)
                return $scope.objList[i];
        }
        
    };

    homeCtrl.getHighestId = function() {

        var highestId = 0;
        for(var i = 0; i < $scope.objList.length; i++) {
            if ($scope.objList[i].id > highestId)
                highestId = $scope.objList[i].id;
        }
        return highestId;
    };
    
    /**
     * Resize Canvas
     *
     * @TODO: Replace static optimal width with constant
     */
    homeCtrl.resizeCanvas = function (){ 

        var minWidth = 480;
        var containerWidth = $(homeCtrl.container).width() > minWidth ? $(homeCtrl.container).width() : minWidth;
        var scaleFactor = containerWidth / 847;

        $scope.canvas.setDimensions({
            width: containerWidth
        });

        $scope.canvas.setZoom(scaleFactor);
        $scope.canvas.calcOffset();
        $scope.canvas.renderAll();
    }
    
    /**
     * Init Function
     *
     * @TODO: Load FabricJs objects from Server
     */
    homeCtrl.init = function() {

        // create a wrapper around native canvas element (with id="fabricjs")
        $scope.canvas = new fabric.Canvas('fabricjs');
        $scope.canvas.selection = false;
        homeCtrl.container = $('#canvas-container');

        //Register resize event
        $(window).resize( homeCtrl.resizeCanvas );

        //Resize canvas on first load
        homeCtrl.resizeCanvas();

        //init objList
        $scope.objList = [];
        
        //add all objects to the canvas
        $scope.objList.forEach(function(obj) {
            $scope.canvas.add(obj);
        });
        
        //add image from url
        /*fabric.Image.fromURL('images/icons/user.png', function(oImg) {
            oImg.id = 4;
            
            oImg.originX = 'center';
            oImg.originY = 'center';
            
            oImg.left = 460;
            oImg.top = 120;
            
            $scope.objList.push(oImg);
            $scope.canvas.add(oImg);
        });*/

        homeCtrl.initDrag();

        //register canvas events
        $scope.canvas.on('object:moving', this.emitObjectModifying);
        $scope.canvas.on('object:scaling', this.emitObjectModifying);
        $scope.canvas.on('object:rotating', this.emitObjectModifying);
        $scope.canvas.on('mouse:up', this.emitObjectStoppedModifying);
        $scope.canvas.on('mouse:up', this.dragMouseUp);

        //register socket events
        socketFactory.on('object:modifying', this.onObjectModifying);
        socketFactory.on('object:stoppedModifying', this.onObjectStoppedModifying);
        socketFactory.on('addRectangle', this.onAddRectangle);
        socketFactory.on('addCircle', this.onAddCircle);

        socketFactory.on('users', this.setUsers);
    };

    homeCtrl.setUsers = function(value) {
        $scope.users = value;
    };

    homeCtrl.initDrag = function() {

        $(window).on('mouseup', function(event) {
            homeCtrl.dragMouseUp(event);
        }).on('mousemove', function(event) {
            homeCtrl.dragMouseMove(event);
        });

        homeCtrl.addRectangle = $('#addRectangle');
        homeCtrl.addRectangle.on('mousedown', function(event) {
            event.preventDefault();
            homeCtrl.lockDrag = true;
            homeCtrl.dragObject = $('<div class="addRectangle"></div>');
            homeCtrl.dragObject.css('position', 'fixed');
            homeCtrl.dragObject.css('top', event.clientY);
            homeCtrl.dragObject.css('left', event.clientX);
            homeCtrl.dragObject.name = "rectangle";
            $('body').append(homeCtrl.dragObject);
        });

        homeCtrl.addCircle = $('#addCircle');
        homeCtrl.addCircle.on('mousedown', function(event) {
            event.preventDefault();
            homeCtrl.lockDrag = true;
            homeCtrl.dragObject = $('<div class="addCircle"></div>');
            homeCtrl.dragObject.css('position', 'fixed');
            homeCtrl.dragObject.css('top', event.clientY);
            homeCtrl.dragObject.css('left', event.clientX);
            homeCtrl.dragObject.name = "circle";
            $('body').append(homeCtrl.dragObject);
        });

    };

    homeCtrl.dragMouseUp = function(event) {
        homeCtrl.lockDrag = false;
        if (typeof homeCtrl.dragObject !== 'undefined') {
            homeCtrl.dragObject.remove();
            homeCtrl.addNewShape(event, homeCtrl.dragObject.name);
            homeCtrl.dragObject = undefined;
        }
    };

    homeCtrl.dragMouseMove = function(event) {
        if (homeCtrl.lockDrag && homeCtrl.dragObject != undefined) {
            event.preventDefault();
            console.log('moving');
            homeCtrl.dragObject.css('top', event.clientY - homeCtrl.dragObject.outerHeight());
            homeCtrl.dragObject.css('left', event.clientX - homeCtrl.dragObject.outerWidth());
        }
    };

    homeCtrl.addNewShape = function(event, shape) {

        var left, top, id;

        left = ((event.clientX - $(homeCtrl.container).offset().left) - 25) / $scope.canvas.getZoom();
        top = (event.pageY - $(homeCtrl.container).offset().top) / $scope.canvas.getZoom();
        id = homeCtrl.getHighestId() + 1;

        console.log(left);
        console.log(top);

        if (shape == "rectangle")
        {
            var rectangle = new fabric.Rect({
                left: left,
                top: +top,
                fill: '#FF0000',
                width: 50,
                height: 50,
                originX: 'center',
                originY: 'center',
                id: id
            });

            socketFactory.emit('addRectangle', {
                left: left,
                top: +top,
                id: id
            });
            $scope.objList.push(rectangle);
            $scope.canvas.add(rectangle);
        }
        else if (shape == "circle")
        {
            var circle = new fabric.Circle({
                left: left,
                top: +top,
                fill: '#FF0000',
                radius: 20,
                originX: 'center',
                originY: 'center',
                id: id
            });

            socketFactory.emit('addCircle', {
                left: left,
                top: +top,
                id: id
            });
            $scope.objList.push(circle);
            $scope.canvas.add(circle);
        }
        $scope.canvas.renderAll();
    };

    homeCtrl.onAddRectangle = function(data) {

        var rectangle = new fabric.Rect({
            left: data.left,
            top: data.top,
            fill: '#FF0000',
            width: 50,
            height: 50,
            originX: 'center',
            originY: 'center',
            id: data.id
        });

        $scope.objList.push(rectangle);
        $scope.canvas.add(rectangle);
        $scope.canvas.renderAll();
    };

    homeCtrl.onAddCircle = function(data) {

        var circle = new fabric.Circle({
            left: data.left,
            top: data.top,
            fill: '#FF0000',
            radius: 20,
            originX: 'center',
            originY: 'center',
            id: data.id
        });

        $scope.objList.push(circle);
        $scope.canvas.add(circle);
        $scope.canvas.renderAll();
    };
    
    /**
     * Tell all clients we stopped modifying
     * 
     * @TODO: Working with username is bad, replace with id
     */
    homeCtrl.emitObjectStoppedModifying = function(event) {

        if (homeCtrl.isModifying) {
            socketFactory.emit('object:stoppedModifying', {
                username: commonData.Name
            });
        }

        if (homeCtrl.lockDrag && homeCtrl.dragObject != undefined) {
            homeCtrl.lockDrag = false;
            if (typeof homeCtrl.dragObject !== 'undefined') {
                homeCtrl.dragObject.remove();
                homeCtrl.addNewShape(event, homeCtrl.dragObject.name);
                homeCtrl.dragObject = undefined;
            }
        }
    };
    
    /**
     * Current Client is modifying object
     *
     * @TODO: Move boundary check to seperate function
     */
    homeCtrl.emitObjectModifying = function(event) {
        
        homeCtrl.isModifying = true;
        
        var activeObject = event.target,
            reachedLimit = false,
            
            objectLeft = activeObject.left,
            objectTop = activeObject.top,
            objectWidth = (activeObject.width * activeObject.scaleX) / 2 ,
            objectHeight = (activeObject.height * activeObject.scaleY) / 2,
            canvasWidth = $scope.canvas.width/$scope.canvas.getZoom(),
            canvasHeight = $scope.canvas.height/$scope.canvas.getZoom();

        if (objectLeft < objectWidth) {
            reachedLimit = true;
            activeObject.left = objectWidth;
        }
        if (objectLeft+objectWidth > canvasWidth) {
            reachedLimit = true;
            activeObject.left = canvasWidth-objectWidth;
        }
        
        if (objectTop < objectHeight) {
            reachedLimit = true;
            activeObject.top = objectHeight;
        }
        if (objectTop+objectHeight > canvasHeight) {
            reachedLimit = true;
            activeObject.top = canvasHeight-objectHeight;
        }
        
        if (reachedLimit) {
            activeObject.setCoords();
            $scope.canvas.renderAll();
        }
        
        if (typeof homeCtrl.currentMoveTimeout !== 'undefined')
            clearTimeout(homeCtrl.currentMoveTimeout);

        homeCtrl.currentMoveTimeout = setTimeout(function() {
            
            socketFactory.emit('object:modifying', {
                id: activeObject.id,
                left: activeObject.left,
                top: activeObject.top,
                scaleX: activeObject.scaleX,
                scaleY: activeObject.scaleY,
                angle: activeObject.angle,
                username: commonData.Name
            });
        }, 25);

        
    };
    
    /**
     * Object was modified by another client
     *
     * @TODO: Move editorBubble into own function
     */
    homeCtrl.onObjectModifying = function(value) {
        
        var obj = homeCtrl.getObjectById(value.id);
        var editorBubble = homeCtrl.getEditorBubble(value.username);

        if (homeCtrl.getEditorBubble(value.username).length == 0) {
            $('#mainView').append('<div class="editorBubble" data-user-id="'+value.username+'"><i class="fa fa-user"></i><span class="username"></span></div>');
        }

        if (editorBubble.css('display') == 'none')
            editorBubble.fadeIn(400);
        
        if (typeof obj !== 'undefined') {
            
            obj.animate({
                left: value.left,
                top: value.top,
                scaleX: value.scaleX,
                scaleY: value.scaleY,
                angle: value.angle
            }, {
                duration: 500,
                onChange: function () {
                    obj.setCoords();
                    $scope.canvas.renderAll();

                    var objectLeft = obj.left * $scope.canvas.getZoom(),
                        objectTop = obj.top * $scope.canvas.getZoom(),
                        objectHeight = (obj.height * obj.scaleY * $scope.canvas.getZoom()) / 2;

                    editorBubble.find('span[class=username]').text(value.username);
                    editorBubble.css('left', $('#fabricjs').offset().left+objectLeft-editorBubble.outerWidth() / 2);
                    editorBubble.css('top', $('#fabricjs').offset().top+objectTop-objectHeight-editorBubble.outerHeight());
                },
                onComplete: function () {
                    
                }
            });

        }

    };
    
    /**
     * Gets called after mouse is released on other client
     */
    homeCtrl.onObjectStoppedModifying = function(value) {
        
        homeCtrl.isModifying = false;
        
        if (typeof homeCtrl.currentMoveTimeout !== 'undefined') {
            clearTimeout(homeCtrl.currentMoveTimeout);
            homeCtrl.currentMoveTimeout = undefined;
        }

        if (homeCtrl.getEditorBubble(value.username).length > 0) {
            homeCtrl.getEditorBubble(value.username).fadeOut(400, function() {
                $(this).remove();
            });
        }

    };

    homeCtrl.init();

})

/**
 * Basic Profile Controller
 */
.controller('ProfileCtrl', function($scope, $location, commonData, socketFactory) {
    
    if (commonData.Name != '')
        $location.path('/fabric');
    
    $scope.submitName = function() {
        commonData.Name = $scope.user.name;
        $location.path('/fabric');
    };
});
