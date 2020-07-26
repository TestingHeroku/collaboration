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
        var ids = [];

        // Get all object´s id (less than 100 because they are marks), 
        // sort them, then search for a missing one
        $scope.objList.forEach(obj => {
            if (obj.id < 100) {
                ids.push(obj.id);
            }
        });
        ids = ids.sort((a, b) => a - b);
        var i = 1;
        for(var id of ids) {
            if (id != i) {
                return i - 1;
            }
            i++;
        };

        // if doesn't find a missing then search for highest one
        var highestId = 0;
        $scope.objList.forEach(obj => {
            highestId = obj.id < 100 && obj.id > highestId ? obj.id : highestId;
        });

        return highestId;
    };

    homeCtrl.getMarkId = function() {
        var highestId = 100;
        $scope.objList.forEach(obj => {
            highestId = obj.id > highestId ? obj.id : highestId;
        });

        return highestId;
    };

    homeCtrl.removeItem = function(value) { 
        var index = $scope.objList.indexOf(value);
        if (index > -1) {
            $scope.objList.splice(index, 1);
        }
    };
    
    /**
     * Resize Canvas
     *
     * @TODO: Replace static optimal width with constant
     */
    homeCtrl.resizeCanvas = function (){
        $scope.canvas.setDimensions({
            width: 1200, //$(homeCtrl.container).width(),
            height: 500 //$(window).innerHeight() - 80
        });
        
        var margin = ($(window).innerWidth() - 1200) * 0.5;
        $('#canvas-container').css( {'margin-left' : margin +'px' } );
        
        $scope.canvas.setZoom(1);
        $scope.canvas.calcOffset();
        $scope.canvas.renderAll();
    };
    
    /**
     * Init Function
     *
     * @TODO: Load FabricJs objects from Server
     */
    homeCtrl.init = function() {
        // Create a wrapper around native canvas element (with id="fabricjs")
        $scope.canvas = new fabric.Canvas('fabricjs');
        $scope.canvas.backgroundColor = '#C2FFC5';
        $scope.canvas.isDrawingMode = false;
        $scope.canvas.hoverCursor = 'arrow';
        $scope.canvas.selection = false;
        $scope.canvas.freeDrawingBrush.color = '#0000FF';
        $scope.canvas.freeDrawingBrush.width = 2;
        homeCtrl.container = $('#canvas-container');

        $scope.session = commonData.Session;
        
        // TODO: Change this condition
        if (commonData.Name != 'Coachavez') {
            $('#admin-tools').hide();
        }

        $('#drawing-mode').on('click', function() {
            $scope.canvas.isDrawingMode = !$scope.canvas.isDrawingMode;
            if ($scope.canvas.isDrawingMode) {
                $('#drawing-mode i').removeClass().addClass('fa fa-arrows')
            } else {
                $('#drawing-mode i').removeClass().addClass('fa fa-pencil')
                homeCtrl.deletePaths();
            }
        });

        $('#drawing-stroke').on('change', function() {
            $scope.canvas.freeDrawingBrush.width = this.value;
        });

        $('#drawing-color').on('change', function() {
            $scope.canvas.freeDrawingBrush.color = this.value;
        });

        $('#create-triangle').on('click', function() {
            homeCtrl.addNewMark('triangle');
        });

        $('#create-hexagon').on('click', function() {
            homeCtrl.addNewMark('hexagon');
        });

        $('#delete-triangle-line').on('click', function() {
            homeCtrl.deleteMarks();
        });

        // Register resize event
        $(window).resize( homeCtrl.resizeCanvas );
        
        // Register keyboard events
        $(window).keydown( function(event) {
            if (event.keyCode == 8 || event.keyCode == 46) {
                event.preventDefault();
                homeCtrl.deleteObj();
            } else if (event.keyCode == 88 || event.keyCode == 120) {
                event.preventDefault();
                homeCtrl.markX(true);
            } else if (event.keyCode == 90 || event.keyCode == 122) {
                event.preventDefault();
                homeCtrl.markX(false);
            }
        });

        // Resize canvas on first load
        homeCtrl.resizeCanvas();

        homeCtrl.addAreas();

        // Init objList
        $scope.objList = [];
        
        homeCtrl.initDrag();

        // Register canvas events
        $scope.canvas.on('object:moving', homeCtrl.emitObjectModifying);
        $scope.canvas.on('object:scaling', homeCtrl.emitObjectModifying);
        $scope.canvas.on('object:rotating', homeCtrl.emitObjectModifying);
        $scope.canvas.on('object:removed', homeCtrl.emitObjectRemoved);
        $scope.canvas.on('path:created', homeCtrl.emitObjectAdded);
        $scope.canvas.on('mouse:up', homeCtrl.emitObjectStoppedModifying);
        $scope.canvas.on('mouse:up', homeCtrl.dragMouseUp);

        // Register socket events
        socketFactory.on('object:modifying', homeCtrl.onObjectModifying);
        socketFactory.on('object:stoppedModifying', homeCtrl.onObjectStoppedModifying);
        socketFactory.on('addShape', homeCtrl.onAddShape);
        socketFactory.on('addMark', homeCtrl.onAddMark);
        socketFactory.on('users', homeCtrl.setUsers);
        socketFactory.on('objectPathRemoved', homeCtrl.onObjectPathRemoved);
        socketFactory.on('objectGroupRemoved', homeCtrl.onObjectGroupRemoved);
        socketFactory.on('objectPathAdded', homeCtrl.onObjectPathAdded);
        socketFactory.on('changeMarkX', homeCtrl.onChangeMarkX);
    };

    homeCtrl.addAreas = function() {
        var objects = $scope.canvas.getObjects();
        for (var i = 0; i < objects.length; i++) {
            if (objects[i].id == -1) {
                $scope.canvas.remove(objects[i]);
            }
        }

        var w = $scope.canvas.width;
        var h = $scope.canvas.height;

        // Add areas to the canvas
        var pointsLateralArea = [
            {x:0, y:0},
            {x:w * 0.1, y:0},
            {x:w * 0.1, y:h},
            {x:0, y:h}
        ];
        var lateralArea = new fabric.Polygon(pointsLateralArea, { 
            stroke: 'gray',
            strokeWidth: 1,
            strokeDashArray: [1,3],
            fill: '#000',
            selectable: false,
            id: -1
        });
        $scope.canvas.add(lateralArea);

        var grid = new fabric.Polyline([
            { x: w * 0.1 , y: h * 0.2 },
            { x: w       , y: h * 0.2 },
            { x: w       , y: h * 0.4 },
            { x: w * 0.1 , y: h * 0.4 },
            { x: w * 0.1 , y: h * 0.6 },
            { x: w       , y: h * 0.6 },
            { x: w       , y: h * 0.8 },
            { x: w * 0.1 , y: h * 0.8 },
            { x: w * 0.1 , y: h },
            { x: w * 0.28, y: h },
            { x: w * 0.28, y: 0 },
            { x: w * 0.46, y: 0 },
            { x: w * 0.46, y: h },
            { x: w * 0.64, y: h },
            { x: w * 0.64, y: 0 },
            { x: w * 0.82, y: 0 },
            { x: w * 0.82, y: h }
        ], {
            stroke: 'gray',
            strokeWidth: 1,
            strokeDashArray: [1,1],
            fill: 'transparent',
            selectable: false,
            id: -1
        });
        $scope.canvas.add(grid);

        /*var pointsCentralArea = [
            {x:$scope.canvas.width * 0.28, y:$scope.canvas.height * 0.28},
            {x:$scope.canvas.width * 0.82, y:$scope.canvas.height * 0.28},
            {x:$scope.canvas.width * 0.82, y:$scope.canvas.height * 0.82},
            {x:$scope.canvas.width * 0.28, y:$scope.canvas.height * 0.82}
        ];
        var centralArea = new fabric.Polygon(pointsCentralArea, { 
            stroke: 'gray',
            strokeWidth: 1,
            strokeDashArray: [1,1],
            fill: 'transparent',
            selectable: false,
            id: -1
        });
        $scope.canvas.add(centralArea);*/
    }

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
        top = top < 0 ? 10 : top;
        id = homeCtrl.getHighestId() + 1;
        homeCtrl.createShape(left, top, id, shape);

        socketFactory.emit('addShape', {
            left: left,
            top: top,
            id: id,
            shape: shape
        });
    };

    homeCtrl.createShape = function(left, top, id, shape) {
        switch(shape) {
            case 'smRectangle':
                var stringPath = 'M0,0 l0,30 l30,0 l0,-30 l-12,0 l-3,10 l-3,-10 z';
                var backColor = '#0000FF';
                var sizeFont = 20;
                var cross = 30;
                break;
            case 'mdRectangle':
                var stringPath = 'M0,0 l0,40 l40,0 l0,-40 l-16,0 l-4,10 l-4,-10 z';
                var backColor = '#0000FF';
                var sizeFont = 25;
                var cross = 40;
                break;
            case 'lgRectangle':
                var stringPath = 'M0,0 l0,50 l50,0 l0,-50 l-20,0 l-5,10 l-5,-10 z';
                var backColor = '#0000FF';
                var sizeFont = 30;
                var cross = 50;
                break;
            case 'smCircle':
                var stringPath = 'M10,0 a15,15 0 1,0 10,0 l-5,5 z';
                var backColor = '#FF0000';
                var sizeFont = 15;
                var cross = 20;
                break;
            case 'mdCircle':
                var stringPath = 'M15,0 a20,20 0 1,0 10,0 l-5,8 z';
                var backColor = '#FF0000';
                var sizeFont = 20;
                var cross = 25;
                break;
            case 'lgCircle':
                var stringPath = 'M20,0 a25,25 0 1,0 10,0 l-5,10 z';
                var backColor = '#FF0000';
                var sizeFont = 20;
                var cross = 30;
                break;
        }
        
        var group = homeCtrl.getShape(left, top, id, stringPath, backColor, sizeFont, cross);
        $scope.objList.push(group);
        $scope.canvas.add(group);
        $scope.canvas.renderAll();
    };

    homeCtrl.getShape = function(left, top, id, stringPath, backColor, sizeFont, cross) {
        var path = new fabric.Path(stringPath);
        path.set({
            fill: backColor,
            originX: 'center',
            originY: 'center'
        });

        var text = new fabric.Text(''+id, {
            fontSize: sizeFont,
            originX: 'center',
            originY: 'center'
        });

        var line1 = new fabric.Line([0,0,cross,cross], {
            left: 0,
            top: 0,
            stroke: 0,
            originX: 'center',
            originY: 'center'
        });

        var line2 = new fabric.Line([cross,0,0,cross], {
            left: 0,
            top: 0,
            stroke: 0,
            originX: 'center',
            originY: 'center'
        });

        var group = new fabric.Group([ path, text, line1, line2 ], {
            left: left,
            top: top,
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
    };

    homeCtrl.addNewMark = function(shape) {
        var left, top, id;
        
        left = $scope.canvas.width * 0.5;
        top = $scope.canvas.height * 0.5 ;
        id = homeCtrl.getMarkId() + 1;
        homeCtrl.createMark(left, top, id, shape);

        socketFactory.emit('addMark', {
            left: left,
            top: top,
            id: id,
            shape: shape
        });
    };

    homeCtrl.createMark = function(left, top, id, shape) {
        switch(shape) {
            case 'triangle':
                var mark = new fabric.Triangle({
                    left: left,
                    top: top,
                    fill: 'transparent',
                    stroke: 1,
                    originX: 'center',
                    originY: 'center',
                    id: id
                });
                break;
            case 'hexagon':
                var points = [
                    { x: 20, y: 0 },
                    { x: 0, y: 20 },
                    { x: 0, y: 40 },
                    { x: 20, y: 60 },
                    { x: 40, y: 60 },
                    { x: 60, y: 40 },
                    { x: 60, y: 20 },
                    { x: 40, y: 0 },
                    { x: 20, y: 0 }
                ]
                var mark = new fabric.Polygon(points, {
                    left: left,
                    top: top,
                    fill: 'black',
                    originX: 'center',
                    originY: 'center',
                    id: id
                });
                break;
        }
        
        $scope.objList.push(mark);
        $scope.canvas.add(mark);
        $scope.canvas.renderAll();
    };

    homeCtrl.onAddMark = function(data) {
        homeCtrl.createMark(data.left, data.top, data.id, data.shape);
    };

    homeCtrl.deleteObj = function() {
        var activeObject = $scope.canvas.getActiveObject();
        if (activeObject !== undefined && activeObject !== null)
        {
            if (activeObject.type === 'activeSelection') {
                activeObject.canvas = $scope.canvas;
                activeObject.forEachObject(function(obj) {
                    homeCtrl.removeItem(obj);
                    $scope.canvas.remove(obj);
                });
            } else {
                homeCtrl.removeItem(activeObject);
                $scope.canvas.remove(activeObject);
            }
        }
    };

    homeCtrl.deletePaths = function() {
        var objects = $scope.canvas.getObjects();
        for (var i = 0; i < objects.length; i++) {
            if (objects[i].type == 'path') {
                $scope.canvas.remove(objects[i]);
            }
        }
    };

    homeCtrl.deleteMarks = function() {
        var objects = $scope.canvas.getObjects();
        for (var i = 0; i < objects.length; i++) {
            if (objects[i].id > 100) {
                $scope.canvas.remove(objects[i]);
            }
        }
    };

    homeCtrl.markX = function(show) {
        var activeObject = $scope.canvas.getActiveObject();
        if (activeObject !== undefined && activeObject !== null) {
            if (activeObject.type == 'group') {
                var value = {
                    id: activeObject.id,
                    show: show
                }
                homeCtrl.onChangeMarkX(value);
                socketFactory.emit('changeMarkX', value);
            }
        }
    };

    homeCtrl.onChangeMarkX = function(value) {
        var object = homeCtrl.getObjectById(value.id);
        object.item(2).set({
            stroke: value.show ? 1 : 0
        });
        object.item(3).set({
            stroke: value.show ? 1 : 0
        });
        $scope.canvas.renderAll();
    }

    /**
     * Tell all clients we deleted an object
     */
    homeCtrl.emitObjectRemoved = function(event) {
        if (event.target.type == 'path') {
            socketFactory.emit('objectPathRemoved');
        } else {
            socketFactory.emit('objectGroupRemoved', {
                id: event.target.id
            });
        }
    };

    /**
     * Object path was deleted by another client
     */
    homeCtrl.onObjectPathRemoved = function() {
        homeCtrl.deletePaths();
    };

    /**
     * Object group (circle / rectangle) was deleted by another client
     */
    homeCtrl.onObjectGroupRemoved = function(value) {
        var object = homeCtrl.getObjectById(value.id);
        homeCtrl.removeItem(object);
        $scope.canvas.remove(object);
    };

    /**
     * Tell all clients we added an object
     */
    homeCtrl.emitObjectAdded = function(value) {
        socketFactory.emit('objectPathAdded', {
            path: value.path
        });
    };

    /**
     * Object path was added by another client
     */
    homeCtrl.onObjectPathAdded = function(value) {
        var path = new fabric.Path(value.path.path, {
            stroke: value.path.stroke,
            strokeWidth: value.path.strokeWidth,
            fill: value.path.fill,
            originX: value.path.originX,
            originY: value.path.originY,
            left: value.path.left,
            top: value.path.top
        });
        $scope.canvas.add(path);
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
.controller('ProfileCtrl', function($scope, $location, $http, commonData) {
    $scope.submitClientData = function() {
        $http.get('/api/checkClientCode', {
            params: {code: $scope.user.code}
        })
        .then(function (response) {
            if (response.data) {
                if (response.data.validation == true) {
                    commonData.Name = $scope.user.name;
                    $location.path('/workspace');
                }
            }
        }, function (response) {
            //console.log("Service not Exists" + response.status + response.statusText);
        });
    };
})

/**
 * Admin Controller
 */
.controller('AdminCtrl', function($scope, $location, $http, commonData) {

    $scope.submitAdminCode = function() {
        $http.get('/api/checkAdminCode', {
            params: {code: $scope.admin.code}
        })
        .then(function (response) {
            if (response.data) {
                if (response.data.validation == true) {
                    commonData.Session = response.data.sessionId;
                    commonData.Name = 'Coachavez';
                    $location.path('/workspace');
                }
            }
        }, function (response) {
            //console.log("Service not Exists" + response.status + response.statusText);
        });
    };
});
