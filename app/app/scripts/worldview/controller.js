/**
 * Created by FanTaSyLin on 2016/10/18.
 */

(function () {

    "use strict";

    angular.module("Worldview")
        .controller("WorldviewController", WorldviewController);

    WorldviewController.$inject = ["WorldviewServices", "$cookies"];

    function WorldviewController(WorldviewServices, $cookies) {

        var self = this;
        var BASEINDEXFORBASE = 100; //基础图层的基准z-index
        var BASEINDEXFOROVER = 300; //产品图层的基准z-index
        var projectList = [];

        //数据存在列表 - 维护所有分钟间隔产品的数组
        var timeLineListMinutes = [];
        //数据存在列表 - 维护所有日间隔产品的数组
        var timeLineListDay = [];
        //数据存在列表 - 维护所有月间隔产品的数组
        var timeLineListMonth = [];
        //数据存在列表 - 维护所有年间隔产品的数组
        var timeLineListYear = [];

        var timeLine = new TimeLine();
        var layerMenu = angular.element(document.getElementById("layerMenu"));
        var timeLineElm = angular.element(document.getElementById("timeLine"));
        /*var overlaysZone = angular.element(document.getElementById('overlays-zone'));*/

        self.currentTab = "Layer";
        self.currentTab_LayerMenuModal = "POS";
        self.overLays = [];
        self.baseLays = [];
        /**标记菜单是否折叠 */
        self.isMenuCollapse = false;
        /*模态框中的 灾害类图层分组列表*/
        self.allLayGroups_POS = [];
        /*模态框中的 科研类图层分组列表*/
        self.allLayGroups_GEO = [];

        /*模态框中的 常用图层列表*/
        self.frequentlyLayers = [];

        /*模态框中的 数据排列形式  Collapse  Tile*/
        self.layerMenuType = "Tile";
        /*模态框 面包屑导航条 当前产品组*/
        self.currentGroup = {};
        self.currentLayer = {};
        self.currentInst = {};

        /*功能标签选择*/
        self.selectTab = _selectTab;
        self.selectTab_LayerMenuModal = _selectTab_LayerMenuModal;
        /*判断是否选中某个功能标签*/
        self.isSelectedTab = _isSelectedTab;
        self.isSelectedTab_LayerMenuModal = _isSelectedTab_LayerMenuModal;
        /*折叠菜单栏*/
        self.collapseMenu = _collapseMenu;
        self.extendMenu = _extendMenu;

        /*数据初始化*/
        self.init = _init;
        /*点击图层的眼睛 控制是否显示该图层*/
        self.eyeClick = _eyeClick;
        /*点击打开Layer选择菜单*/
        self.showLayerMenu = _showLayerMenu;

        // self.sortableOptions = _sortableOptions;
        /*在模态框中选择了一个图层项*/
        self.selectLayerItem = _selectLayerItem;
        /*在layer之下选则仪器*/
        self.selectInstonAboveLayer = _selectInstonAboveLayer;
        self.isInstSelected = _isInstSelected;
        /*添加产品到图层 （或者移除产品到图层）*/
        self.addThisProject = _addThisProject;
        /*移除选中的图层*/
        self.removeThisLayer = _removeThisLayer;

        _init();

        //时间轴控件发生日期改变时 重新加载所有图层
        timeLineElm.on("DateTimeChange", function (event, selectDate) {
            _refreshLayers();
        });

        /**
         * 拖拽指令函数
         *
         * 不用function的形式 是因为 如果写成以下形式 则不会触发任何事件
         * this.sortableOptions = _sortableOptions;
         * function _sortableOptions() {
         *     return {
         *         stop: function (e, ui) {
         *             alert("stop");
         *             _refreshLayers();
         *         }
         *     }
         * }
         */
        self.sortableOptions = {
            // 完成拖拽动作
            stop: function (e, ui) {
                //触发openlayer控件的刷新
                _refreshLayers();
            }

        };

        /**
         * 重载所有已添加的图层
         * @private
         */
        function _refreshLayers() {
            var tmpList = [];
            timeLineListMinutes = [];
            //记住一条 图层列表 先进后出 才能保证 后加的在先加的之上；
            self.overLays.forEach(function (layModule) {
                //_removeLayFromWMS(layModule);
                //_addLayToWMS(layModule);
                tmpList.unshift(layModule);
            });
            self.baseLays.forEach(function (layModule) {
                //_removeLayFromWMS(layModule);
                //_addLayToWMS(layModule);
                tmpList.unshift(layModule);
            });
            for (var i = 0; i < tmpList.length; i++) {
                _removeLayFromWMS(tmpList[i]);
                _addLayToWMS(tmpList[i]);
            }
            _refreshLaysCookies();
        }

        /**
         * 刷新 保存 cookies 中图层信息的属性
         * @private
         */
        function _refreshLaysCookies() {
            // console.log('_refreshLaysCookies');
            //删除原有图层cookies
            $cookies.remove("overLays");
            $cookies.remove("baseLays");
            //加入新图层信息
            $cookies.putObject("overLays", self.overLays);
            $cookies.putObject("baseLays", self.baseLays);
            // console.log(self.overLays);
        }

        /**
         * 从 layerList 移除 layer 对象
         *
         * @param {Object} layer 目标图层对象
         * @param {Array} layerList 所属数组
         */
        function _removeThisLayer(layer, layerList) {
            layer.isSelected = false;
            for (var i = 0; i < layerList.length; i++) {
                if (layer._id === layerList[i]._id) {
                    layerList.splice(i, 1);
                }
            }
            //移除
            _removeLayFromWMS(layer);
            //移除TimeLine
            //移除cookies
            _refreshLaysCookies();
        }

        function _addThisProject(project) {
            project.isSelected = !project.isSelected;

            /**
             * TODO: 对应的图层列表也应该发生变化
             * 1. 添加到图层时 应判断是加入到 overLays 还是 baseLays中
             */
            if (project.layType === 'BASELAYERS') {
                if (project.isSelected === true) {
                    //增加
                    project.isShow = true;
                    self.baseLays.unshift(project);
                    _addLayToWMS(project);
                } else {
                    //移除
                    for (var i = 0; i < self.baseLays.length; i++) {
                        if (project._id === self.baseLays[i]._id) {
                            self.baseLays.splice(i, 1);
                        }
                    }
                    _removeLayFromWMS(project);
                }
            } else {
                if (project.isSelected === true) {
                    //增加
                    project.isShow = true;
                    self.overLays.unshift(project);
                    _addLayToWMS(project);
                } else {
                    //移除
                    for (var i = 0; i < self.overLays.length; i++) {
                        if (project._id === self.overLays[i]._id) {
                            self.overLays.splice(i, 1);
                        }
                    }
                    _removeLayFromWMS(project);
                }
            }
        }

        function _selectInstonAboveLayer(inst) {
            self.currentInst = inst;
            self.currentProjectList = inst.projectList;
        }

        function _isInstSelected(instName) {
            return (self.currentInst === undefined) ? false : self.currentInst.instName === instName;
        }

        function _selectLayerItem(layer, group) {
            self.layerMenuType = 'Collapse';
            self.currentGroup = group;
            self.currentLayer = layer;
            //默认第一个仪器被选中
            self.currentInst = (layer.group === undefined || layer.group.instGroupList.length < 1) ? undefined : layer.group.instGroupList[0];
            //每次点击 都要在$cookies.frequentlyUsed 中增加依次计数
            _frequentlyCount(layer.layerName);
        }

        function _frequentlyCount(layerName) {
            var frequentlyUsed = $cookies.getObject('frequently-used');
            frequentlyUsed.forEach(function (item) {
                if (item.layerName === layerName) {
                    item.frequently++;
                }
            });
            var expireTime = new Date();
            expireTime.setDate(expireTime.getDate() + 7000);
            $cookies.putObject('frequently-used', frequentlyUsed, {'expires': expireTime});
        }

        /**
         * 初始化图层列表
         * @param cb
         * @private
         */
        function _initLayerMenuModal(cb) {
            WorldviewServices.getLayerGroupList(function (data) {
                self.allLayGroups_POS.splice(0, self.allLayGroups_POS.length);
                self.allLayGroups_GEO.splice(0, self.allLayGroups_GEO.length);
                data.data.forEach(function (item) {
                    if (item.type === 'POS') {
                        if (item.pictureUrl === "") {
                            item.pictureUrl = 'publics/Black.png'
                        }
                        self.allLayGroups_POS.push(item);
                    } else if (item.type === 'GEO') {
                        if (item.pictureUrl === "") {
                            item.pictureUrl = 'publics/Black.png'
                        }
                        self.allLayGroups_GEO.push(item);
                    }
                });

                /**
                 * 初始化常用图层
                 * cookie 如果不存在常用图层 则创建一个
                 */
                _initFrequentlyLayers();


                //获取实际产品列表
                WorldviewServices.getProjectInfoList(function (data) {

                    projectList = [];

                    //为每一个产品对象增加 [isSelected]属性
                    //为每个产品对象增加一个 z-index 属性
                    data.data.forEach(function (item) {
                        item = _addAttributeToLayObj(item);
                        projectList.push(item);
                    });


                    //1. 为分组生成仪器列表
                    var layerGroupList = _groupProjectList(data);

                    //2. 将结果放入对应的分组
                    self.allLayGroups_POS.forEach(function (item) {
                        for (var i = 0; i < item.layers.length; i++) {
                            var layer = item.layers[i];
                            for (var j = 0; j < layerGroupList.length; j++) {
                                var layerGroup = layerGroupList[j];
                                if (layer.layerName === layerGroup.layerName && layerGroup.satType === 'POS') {
                                    layer.group = layerGroup;
                                    layer.instString = '';
                                    var instGroup = layerGroup.instGroupList;
                                    instGroup.forEach(function (inst) {
                                        layer.instString += inst.instName + ' ';
                                    });
                                    break;
                                }
                            }
                        }
                    });

                    self.allLayGroups_GEO.forEach(function (item) {
                        for (var i = 0; i < item.layers.length; i++) {
                            var layer = item.layers[i];
                            for (var j = 0; j < layerGroupList.length; j++) {
                                var layerGroup = layerGroupList[j];
                                if (layer.layerName === layerGroup.layerName && layerGroup.satType === 'GEO') {
                                    layer.group = layerGroup;
                                    layer.instString = '';
                                    var instGroup = layerGroup.instGroupList;
                                    instGroup.forEach(function (inst) {
                                        layer.instString += inst.instName + ' ';
                                    });
                                    break;
                                }
                            }
                        }
                    });

                    //3. 别忘了常用图层列表
                    self.frequentlyLayers.forEach(function (layer) {
                        for (var j = 0; j < layerGroupList.length; j++) {
                            var layerGroup = layerGroupList[j];
                            if (layer.layerName === layerGroup.layerName) {
                                layer.group = layerGroup;
                                layer.instString = '';
                                var instGroup = layerGroup.instGroupList;
                                instGroup.forEach(function (inst) {
                                    layer.instString += inst.instName + ' ';
                                });
                                break;
                            }
                        }
                    });
                    if (cb !== undefined) {
                        cb();
                    }

                }, function (res) {

                });

            }, function (res) {

            });
        }

        /**
         * 为每一个产品对象增加属性
         * @param projectObj
         * @private
         */
        function _addAttributeToLayObj(projectObj) {

            /**
             * 为每一个产品对象增加 [isSelected]属性
             * 该属性用于控制产品对象是否被选中加入图层列表中。
             * @type {boolean}
             */
            projectObj.isSelected = false;

            /**
             * 该属性用于控制产品对象在openlayer中显示或隐藏。
             * 默认为 显示
             */
            projectObj.isShow = true;

            /**
             * 为每个产品对象增加一个 z-index 属性
             * 该选项用于在加入图层列表后标识应处于的层级
             * @type {number}
             */
            projectObj.zIndex = 0;

            return projectObj;
        }

        /**
         * 初始化常用图层列表
         * @param {type} name description
         */
        function _initFrequentlyLayers() {
            var frequentlyUsed = $cookies.getObject('frequently-used');
            if (frequentlyUsed === undefined) {
                // cookie 如果不存在常用图层 则创建一个
                var frequentlyUsed = [];
                self.allLayGroups_POS.forEach(function (item) {
                    for (var i = 0; i < item.layers.length; i++) {
                        var layer = item.layers[i];
                        var isExistLayer = false;
                        for (var j = 0; j < frequentlyUsed.length; j++) {
                            if (frequentlyUsed[j].layerName === layer.layerName) {
                                isExistLayer = true;
                                break;
                            }
                        }
                        if (isExistLayer === false) {
                            layer.frequently = 0;
                            frequentlyUsed.push(layer);
                        }
                    }
                });
                self.allLayGroups_GEO.forEach(function (item) {
                    for (var i = 0; i < item.layers.length; i++) {
                        var layer = item.layers[i];
                        var isExistLayer = false;
                        for (var j = 0; j < frequentlyUsed.length; j++) {
                            if (frequentlyUsed[j].layerName === layer.layerName) {
                                isExistLayer = true;
                                break;
                            }
                        }
                        if (isExistLayer === false) {
                            layer.frequently = 0;
                            frequentlyUsed.push(layer);
                        }
                    }
                });

                var expireTime = new Date();
                expireTime.setDate(expireTime.getDate() + 7000);
                $cookies.putObject('frequently-used', frequentlyUsed, {'expires': expireTime});
            } else {
                frequentlyUsed.sort(function (a, b) {
                    return -(a.frequently - b.frequently);
                });
                self.frequentlyLayers.splice(0, self.frequentlyLayers.length);
                var maxLength = (frequentlyUsed.length > 5) ? 5 : frequentlyUsed.length;
                for (var k = 0; k < maxLength; k++) {
                    if (frequentlyUsed[k].frequently != 0) {
                        self.frequentlyLayers.push(frequentlyUsed[k]);
                    }
                }
            }
        }

        /**
         * 初始化图层组、卫星仪器、产品的分组列表
         *
         * @param {any} data
         * @returns
         */
        function _groupProjectList(data) {
            //1. 为分组生成仪器列表

            var instGroup = {
                instName: '',
                projectList: []
            };

            var layerGroup = {
                layerName: '',
                instString: '',
                instGroupList: []
            };

            var layerGroupList = [];

            data.data.forEach(function (item) {
                var isExistLayerGroup = false
                for (var i = 0; i < layerGroupList.length; i++) {
                    var tmpLayerGroup = layerGroupList[i];
                    if (tmpLayerGroup.layerName === item.layerName && tmpLayerGroup.satType === item.satType) {
                        isExistLayerGroup = true;
                        //存在 此layerGroup 则看看instName 是否存在
                        var isExistInstGroup = false
                        for (var j = 0; j < tmpLayerGroup.instGroupList.length; j++) {
                            var tmpInstGroup = tmpLayerGroup.instGroupList[j];
                            if (tmpInstGroup.instName === (item.satID + '/' + item.instID)) {
                                isExistInstGroup = true;
                                //存在 此instGroup 看看project 是否存在
                                var isExistProject = false;
                                for (var k = 0; k < tmpInstGroup.projectList.length; k++) {
                                    var tmpProject = tmpInstGroup.projectList[k];
                                    if (tmpProject.projectName === item.projectName) {
                                        //存在 此project
                                        isExistProject = true;
                                        break;
                                    }
                                }

                                if (isExistProject === false) {
                                    //不存在 此project
                                    tmpInstGroup.projectList.push(item);
                                }
                            }
                        }

                        if (isExistInstGroup === false) {
                            //不存在 此instGroup 创建新的 instGroup
                            var tmpInstGroup = {
                                instName: item.satID + '/' + item.instID,
                                satType: item.satType,
                                projectList: []
                            }

                            tmpInstGroup.projectList.push(item);
                            tmpLayerGroup.instGroupList.push(tmpInstGroup);
                        }
                    }
                }

                if (isExistLayerGroup === false) {
                    //不存在 此layerGroup 创建新的 layerGroup
                    var tmpLayerGroup = {
                        layerName: item.layerName,
                        satType: item.satType,
                        instGroupList: []
                    }

                    var tmpInstGroup = {
                        instName: item.satID + '/' + item.instID,
                        projectList: []
                    }

                    tmpInstGroup.projectList.push(item);
                    tmpLayerGroup.instGroupList.push(tmpInstGroup);
                    layerGroupList.push(tmpLayerGroup);
                }
            });

            return layerGroupList;
        }

        /**
         * 点击显示图层选择模态框
         */
        function _showLayerMenu() {
            layerMenu.modal({backdrop: 'static', keyboard: false});
        }

        /**
         * 点击加载或隐藏图层
         * @param layModule
         * @private
         */
        function _eyeClick(layModule) {
            layModule.isShow = !layModule.isShow;
            _setVisibilityFromWMS(layModule);
            // _refreshLaysCookies();
        }

        /**
         * 往控件中添加图层
         * @param layModule
         * @private
         */
        function _addLayToWMS(layModule) {
            var projectUrl = layModule.projectUrl;
            if (projectUrl.indexOf('yyyy') > 0) {
                projectUrl = projectUrl.replace('yyyy', moment(timeLine.GetShowDate()).utc().format("YYYY"));
            }
            if (projectUrl.indexOf('MM') > 0) {
                projectUrl = projectUrl.replace('MM', moment(timeLine.GetShowDate()).utc().format("MM"));
            }
            if (projectUrl.indexOf('dd') > 0) {
                projectUrl = projectUrl.replace('dd', moment(timeLine.GetShowDate()).utc().format("DD"));
            }
            if (projectUrl.indexOf('hh') > 0) {
                projectUrl = projectUrl.replace('hh', moment(timeLine.GetShowDate()).utc().format("HH"));
            }
            if (projectUrl.indexOf('mm') > 0) {
                projectUrl = projectUrl.replace('mm', moment(timeLine.GetShowDate()).utc().format("mm"));
            }
            WMS.addLayer(layModule._id, layModule.layerName, projectUrl, "false", layModule.mapType);
            if (layModule.isShow === false) {
                _setVisibilityFromWMS(layModule);
            }

            //获取数据存在列表
            _getDataExistList(layModule, function (err, timeLineList) {
                timeLine.AddMinuteData(timeLineListMinutes);
            });
        }

        /**
         * 从WMS控件中移除图层
         * @param layModule
         * @private
         */
        function _removeLayFromWMS(layModule) {
            WMS.removeLayer(layModule._id, layModule.mapType);
            _refreshLaysCookies();
        }

        /**
         * 根据传入的图层 控制其显示与隐藏
         *
         * @param {any} layModule
         */
        function _setVisibilityFromWMS(layModule) {
            WMS.setVisibility(layModule._id, layModule.mapType);
            //刷新cookies 否则在显示不刷新的情况下，cookies中是否可见信息不刷新
            _refreshLaysCookies();
        }

        /**
         * 根据传入的图层对象 获取其数据存在列表 添加年月日全数据
         * @param {Object} layModule 图层对象（产品对象）
         * @param {Function} next callback
         * @callback next
         */
        function _getDataExistList(layModule, next) {

            if (layModule.dataListUrl === '') {
                return;
            }

            WorldviewServices.getDataExistList(layModule.dataListUrl, function (data) {
                //    var timeLineObj = {};
                if (data.dataList_Minute !== undefined && data.dataList_Minute.length > 0) {

                    //分钟数据
                    var timeLineObj_Min = {
                        DataName: layModule.projectName,
                        DataInfo: data.dataList_Minute,
                        Layeris_Show: true
                    };
                    //日数据
                    var timeLineObj_Day = {
                        DataName: layModule.projectName,
                        DataInfo: data.dataList_Day,
                        Layeris_Show: true
                    };
                    //月数据
                    var timeLineObj_Month = {
                        DataName: layModule.projectName,
                        DataInfo: data.dataList_Month,
                        Layeris_Show: true
                    };
                    //年数据
                    var timeLineObj_Year = {
                        DataName: layModule.projectName,
                        DataInfo: data.dataList_Year,
                        Layeris_Show: true
                    };
                    timeLineListMinutes.push(timeLineObj_Min);
                    timeLineListMinutes.push(timeLineObj_Day);
                    timeLineListMinutes.push(timeLineObj_Month);
                    timeLineListMinutes.push(timeLineObj_Year);
                    next();
                }
            }, function (data) {

            });
        }

        /**
         * 根据传入的图层列表 初始化map控件
         * @param lays (self.baseLays + self.overLays)
         * @private
         */
        function _initMap() {
            WMS.init("http://10.24.10.108/IMAGEL2/GBAL/");
        }

        /**
         * 生成一个初始化的lays清单。
         * @returns {Array}
         * @private
         */
        function _initLays() {

            /**
             * 一定在这里要注意图层的顺序
             * 由于OpenLayer无法控制
             */

            projectList.forEach(function (lay) {

                if (lay.isDefault === true) {
                    if (lay.layType === 'BASELAYERS') {
                        self.baseLays.push(lay);
                    }
                    else
                        self.overLays.push(lay);
                    lay.isSelected = true;
                    _addLayToWMS(lay);
                }

            });
        }

        /**
         * 从cookie中获取上次保存的列表
         * @private
         */
        function _initLaysFromCookies() {
            //console.log('_initLaysFromCookies');
            //baseLays 获取cookies
            var m_baseLays = $cookies.getObject('baseLays');
            var m_overLays = $cookies.getObject('overLays');
            // console.log(m_overLays);

            //若Cookies m_baseLays 不为空 加入列表 并加入界面显示
            if (m_baseLays) {
                //遍历添加数据
                m_baseLays.forEach(function (lay) {
                    //判断当前现有列表中 是否存在缓存数据
                    var is_In = false;
                    self.baseLays.forEach(function (layBase) {
                        ////使用——id 判断 唯一性标识
                        if (layBase._id === lay._id) {
                            is_In = true;
                        }
                    });
                    if (!is_In) {
                        self.baseLays.push(lay);
                        _addLayToWMS(lay);
                    }
                });
            }
            //若Cookies m_overLays 不为空 加入列表 并加入界面显示
            if (m_overLays) {
                m_overLays.forEach(function (lay) {
                    //判断当前现有列表中 是否存在缓存数据 与配置中的设置部分叠加
                    var is_In = false;
                    self.overLays.forEach(function (layBase) {
                        //使用——id 判断 唯一性标识
                        if (layBase._id === lay._id) {
                            //  console.log("存在");
                            is_In = true;
                        }
                        //  else   console.log("不存在");
                    });
                    if (!is_In) {
                        self.overLays.push(lay);
                        _addLayToWMS(lay);
                    }
                });
            }

        }

        /**
         * 时间轴初始化
         * @private
         */
        function _initTimeLine() {
            timeLine.Init("timeLine", "MINUTE");
        }

        /**
         * 初始化函数
         * @private
         */
        function _init() {


            //初始化图层列表
            _initLayerMenuModal(function () {

                //根据默认图层初始化openlayer
                _initMap();
                //加入默认选中的图层 加入cookie中的图层
                _initLays();
                //初始化从cookies中获取的图层
                _initLaysFromCookies();
                //初始化时间轴控件
                _initTimeLine();

            });
        }

        function _isSelectedTab(tabName) {
            return self.currentTab === tabName;
        }

        function _selectTab(tabName) {
            self.currentTab = tabName;
        }

        function _isSelectedTab_LayerMenuModal(tabName) {
            return self.currentTab_LayerMenuModal === tabName;
        }

        function _selectTab_LayerMenuModal(tabName) {
            self.currentTab_LayerMenuModal = tabName;
        }

        /**
         * 折叠菜单栏
         */
        function _collapseMenu() {
            self.isMenuCollapse = true;
        }

        /**
         * 展开菜单栏
         */
        function _extendMenu() {
            self.isMenuCollapse = false;
        }
    }

})();