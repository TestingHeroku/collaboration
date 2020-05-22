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
    } else {
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
        $(window).keydown( function(event) {
            if(event.keyCode == 8 || event.keyCode == 46) {
                event.preventDefault();
                homeCtrl.deleteObj();
            }
        });

        //Resize canvas on first load
        homeCtrl.resizeCanvas();

        //init objList
        $scope.objList = [];
        
        //add areas to the canvas
        var pointsLateralArea = [
            {x:0, y:0},
            {x:$scope.canvas.width * 0.05, y:0},
            {x:$scope.canvas.width * 0.05, y:$scope.canvas.height},
            {x:0, y:$scope.canvas.height}
        ];
        var lateralArea = new fabric.Polygon(pointsLateralArea, { 
            stroke: 'gray',
            strokeWidth: 1,
            strokeDashArray: [1,3],
            fill: 'transparent',
            selectable: false
        });
        $scope.canvas.add(lateralArea);

        var pointsCentralArea = [
            {x:$scope.canvas.width * 0.15, y:$scope.canvas.height * 0.15},
            {x:$scope.canvas.width * 0.65, y:$scope.canvas.height * 0.15},
            {x:$scope.canvas.width * 0.65, y:$scope.canvas.height * 0.65},
            {x:$scope.canvas.width * 0.15, y:$scope.canvas.height * 0.65}
        ];
        var centralArea = new fabric.Polygon(pointsCentralArea, { 
            stroke: 'gray',
            strokeWidth: 1,
            strokeDashArray: [1,3],
            fill: 'transparent',
            selectable: false
        });
        $scope.canvas.add(centralArea);

        homeCtrl.initDrag();

        //register canvas events
        $scope.canvas.on('object:moving', homeCtrl.emitObjectModifying);
        $scope.canvas.on('object:scaling', homeCtrl.emitObjectModifying);
        $scope.canvas.on('object:rotating', homeCtrl.emitObjectModifying);
        $scope.canvas.on('mouse:up', homeCtrl.emitObjectStoppedModifying);
        $scope.canvas.on('mouse:up', homeCtrl.dragMouseUp);

        //register socket events
        socketFactory.on('object:modifying', homeCtrl.onObjectModifying);
        socketFactory.on('object:stoppedModifying', homeCtrl.onObjectStoppedModifying);
        socketFactory.on('addShape', homeCtrl.onAddShape);
        socketFactory.on('users', homeCtrl.setUsers);
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

        homeCtrl.mouseDown('smRectangle');
        homeCtrl.mouseDown('mdRectangle');
        homeCtrl.mouseDown('lgRectangle');
        homeCtrl.mouseDown('smCircle');
        homeCtrl.mouseDown('mdCircle');
        homeCtrl.mouseDown('lgCircle');
    };

    homeCtrl.mouseDown = function(element) {
        homeCtrl.object = $('#'+element);
        homeCtrl.object.on('mousedown', function(event) {
            event.preventDefault();
            homeCtrl.lockDrag = true;
            homeCtrl.dragObject = $('<div class="'+element+'"></div>');
            homeCtrl.dragObject.css('position', 'fixed');
            homeCtrl.dragObject.css('top', event.clientY);
            homeCtrl.dragObject.css('left', event.clientX);
            homeCtrl.dragObject.name = element;
            $('body').append(homeCtrl.dragObject);
        });
    }

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
            homeCtrl.dragObject.css('top', event.clientY - homeCtrl.dragObject.outerHeight());
            homeCtrl.dragObject.css('left', event.clientX - homeCtrl.dragObject.outerWidth());
        }
    };

    homeCtrl.addNewShape = function(event, shape) {
        var left, top, id;

        left = ((event.clientX - $(homeCtrl.container).offset().left) - 25) / $scope.canvas.getZoom();
        top = (event.pageY - $(homeCtrl.container).offset().top) / $scope.canvas.getZoom();
        id = homeCtrl.getHighestId() + 1;
        homeCtrl.createShape(left, top, id, shape);

        socketFactory.emit('addShape', {
            left: left,
            top: +top,
            id: id,
            shape: shape
        });
    };

    homeCtrl.createShape = function(left, top, id, shape) {
        switch(shape) {
            case 'smRectangle':
                var stringId = ''+id;
                var stringPath = 'M0,0 l0,30 l30,0 l0,-30 l-12,0 l-3,10 l-3,-10 z';
                var backColor = '#0000FF';
                var sizeFont = 20;
                break;
            case 'mdRectangle':
                var stringId = ''+id;
                var stringPath = 'M0,0 l0,40 l40,0 l0,-40 l-16,0 l-4,10 l-4,-10 z';
                var backColor = '#0000FF';
                var sizeFont = 25;
                break;
            case 'lgRectangle':
                var stringId = ''+id;
                var stringPath = 'M0,0 l0,50 l50,0 l0,-50 l-20,0 l-5,10 l-5,-10 z';
                var backColor = '#0000FF';
                var sizeFont = 30;
                break;
            case 'smCircle':
                var stringPath = 'M15,2 a15,15 0 1,0 10,0 l-5,5 z';
                var backColor = '#FF0000';
                var sizeFont = 15;
                var stringId = '  '+id;
                break;
            case 'mdCircle':
                var stringId = '  '+id;
                var stringPath = 'M20,2 a20,20 0 1,0 10,0 l-5,8 z';
                var backColor = '#FF0000';
                var sizeFont = 20;
                break;
            case 'lgCircle':
                var stringId = '  '+id;
                var stringPath = 'M25,2 a25,25 0 1,0 10,0 l-5,10 z';
                var backColor = '#FF0000';
                var sizeFont = 20;
                break;
        }
        
        var group = homeCtrl.getShape(left, top, id, stringId, stringPath, backColor, sizeFont);
        $scope.objList.push(group);
        $scope.canvas.add(group);
        $scope.canvas.renderAll();
    };

    homeCtrl.getShape = function(left, top, id, stringId, stringPath, backColor, sizeFont){

        var path = new fabric.Path(stringPath);
        path.set({
            fill: backColor,
            originX: 'center',
            originY: 'center'
        });

        var text = new fabric.Text(stringId, {
            fontSize: sizeFont,
            originX: 'center',
            originY: 'center'
        });

        var group = new fabric.Group([ path, text ], {
            left: left,
            top: +top,
            lockScalingX: true,
            lockScalingY: true,
            originX: 'center',
            originY: 'center',
            id: id
        });
        group.setControlsVisibility({
            mt: false, 
            mb: false, 
            ml: false, 
            mr: false, 
            bl: false,
            br: false, 
            tl: false, 
            tr: false
        });

        return group;
    };

    homeCtrl.onAddShape = function(data) {
        homeCtrl.createShape(data.left, data.top, data.id, data.shape);

        /*var rectangle = new fabric.Rect({
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
        $scope.canvas.renderAll();*/
    };

    homeCtrl.deleteObj = function() {
        var activeObject = $scope.canvas.getActiveObject();
        if (activeObject !== undefined && activeObject !== null)
        {
            if (activeObject.type === 'activeSelection') {
                activeObject.canvas = $scope.canvas;
                activeObject.forEachObject(function(obj) {
                    $scope.canvas.remove(obj);
                });
            } else {
                $scope.canvas.remove(activeObject);
            }
        }
    }
    
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
