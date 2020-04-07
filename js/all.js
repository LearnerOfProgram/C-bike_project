  
  var map;
  
  var initialLocation;
  var browserSupportFlag =  new Boolean();
  var currentPost;  //現在位置-小黃人
  var situation = 'default';  //標記重點用
  var ifDemo=false;

  var polygon = null;// This global polygon variable is to ensure only ONE polygon is rendered.
  
  //全域變數，locations_wholeArea用來儲存opendata資料，global_markers儲存opendata資料(marker型別)
  var locations_wholeArea=[], global_markers=[], temp_markers=[];  
  var url;  //用來儲存網址

  var dynamic_StartPoint, dynamic_EndPoint;   //起點終點 全域變數
  var theClickedMarker;

  var ifRoadChanged=false;
  var changeStartPointFlag=false; //是否改變計算的起點
  var ifLockInputflag=false;          //確認是否鎖死輸入欄
  var ifSetFinal=false; //是否設定終點了
  var repeatKeyin=0;  

  var autocomplete;                   //輸入欄autocomplete的控制物件 
  var AllClickListener;

  var global_circle, global_target;   //global_target儲存[使用者輸入地址](型別marker)
  var dynamic_taInfowindow;
  var gobj_directionsDisplay; //最後畫路徑的控制器(全域變數才能偵測二次畫圖問題)

  var dangerRoadIntersection = [];  //十大危險路口(包含5個properties)
  var allWarmMarker=[];

  var MapStyles = [
  {
      featureType: 'water',
      stylers: [
        { color: '#19a0d8' }
      ]
  },{
      featureType: 'administrative',
      elementType: 'labels.text.stroke',
      stylers: [
        { color: '#ffffff' },
        { weight: 6 }
      ]
  },{
      featureType: 'administrative',
      elementType: 'labels.text.fill',
      stylers: [
        { color: '#e85113' }
      ]
  },{
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [
        { color: '#efe9e4' },
        { lightness: -40 }
      ]
  },{
      featureType: 'transit.station',
      stylers: [
        { weight: 9 },
        { hue: '#e85113' }
      ]
  },{
      featureType: 'road.highway',
      elementType: 'labels.icon',
      stylers: [
        { visibility: 'off' }
      ]
  },{
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [
        { lightness: 100 }
      ]
  },{
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [
        { lightness: -100 }
      ]
  },{
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [
        { visibility: 'on' },
        { color: '#f0e4d3' }
      ]
  },{
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [
        { color: '#efe9e4' },
        { lightness: -25 }
      ]
  },{
      featureType: "poi",
      elementType: "labels",
      stylers: [
        { visibility: "off" }
      ]
  }
  ];


  //初始化地圖
  function initMapPathPlanPage() {

    var markers = []; //區域變數，Create a styles array to use with the map.
    var old_clickListener = [];//點擊監聽器

    var distanceMatrixService = new google.maps.DistanceMatrixService();    //用來計算距離的google物件
    var directionsDisplay;                                               //用來得到[路徑分析指示]的google物件
    var geocoder = new google.maps.Geocoder();                          //解析地址成經緯度

    initMap();

    if(ifDemo==false){
      //只有初次進入才載入資料
      LoadDangerRoad(map);      //取得搜尋地址集，searchKeyword填入數值
    }
    //把是故意發點標在地圖上
    var warmMarker_sty = {
        url: "img/attention.png", // url
        scaledSize: new google.maps.Size(65,65), // scaled size
    }; 
    var warmMarker;
    for(let m=0; m<dangerRoadIntersection.length; m++){
        warmMarker = new google.maps.Marker({
            position: new google.maps.LatLng(dangerRoadIntersection[m].intersectLat, dangerRoadIntersection[m].intersectLng),
            map: map,
            icon: warmMarker_sty,
            animation: google.maps.Animation.DROP,
        });
        warmMarker.setMap(map);
        allWarmMarker.push(warmMarker);
    }

    if(location.href.indexOf("?") == -1)
    {
      console.log("直接開始查詢");
      console.log("是否模擬地址: "+ifDemo);
      // 抓到所在位置
      if(window.navigator.geolocation!=undefined) {
          browserSupportFlag = true;
          navigator.geolocation.getCurrentPosition(function(position){

              if(ifDemo==false){
                initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
              }
              else{
                initialLocation = new google.maps.LatLng(22.620424, 120.312047); //高雄市四維行政中心;
              }

              map.setCenter(initialLocation); //將地圖中心設置成所在位置

              var makeSureLat = judgeBetween(initialLocation.lat(), 23.28, 22.28);
              var makeSureLng = judgeBetween(initialLocation.lng(), 121.0115, 120.1032);

              if(makeSureLat==true&&makeSureLng==true){
                //定位符合高雄經緯度
                //customized current marker
                var icon = {
                    url: "img/currentPoint.png", // url
                    scaledSize: new google.maps.Size(80, 80), // scaled size
                }; 
                //set current marker
                currentPost = new google.maps.Marker({
                    position: initialLocation,
                    map: map,
                    icon: icon,
                    animation: google.maps.Animation.DROP,
                });
                currentPost.addListener('click', toggleBounce);
                currentPost.setMap(map);

                //提示窗
                var nowInfowindow = new google.maps.InfoWindow();
                var showText ="<div class='nowInfowindow'>請點擊上方［取得腳踏車］</div>";
                nowInfowindow.setContent(showText);
                nowInfowindow.addListener('closeclick', function() {
                  nowInfowindow.close(map, currentPost);
                });
                nowInfowindow.open(map, currentPost);

                dynamic_StartPoint = currentPost; //型別marker
                dynamic_EndPoint = "";

                //載入腳踏車資訊
                //存取OpenData內容
                var locations=[]; //區域變數
                $.ajax({
                  type: "GET",
                  url: "./opendata/bikeInfo.xml",
                  dataType: "xml",
                  success: function(xml){
                      var JSONobject = xmlToJson(xml);

                      var length = JSONobject.BIKEStationData.BIKEStation.Station.length;
                      for (let i=0; i<length; i++){
                          var bike_lat = parseFloat(JSONobject.BIKEStationData.BIKEStation.Station[i].StationLat);
                          var bike_lng = parseFloat(JSONobject.BIKEStationData.BIKEStation.Station[i].StationLon);
                          locations[i] = {
                              'title': JSONobject.BIKEStationData.BIKEStation.Station[i].StationName,
                              'where': {lat: bike_lat, lng: bike_lng},
                              'availBike': JSONobject.BIKEStationData.BIKEStation.Station[i].StationNums1,
                              'availSPace': JSONobject.BIKEStationData.BIKEStation.Station[i].StationNums2,
                              'stopID': JSONobject.BIKEStationData.BIKEStation.Station[i].StationID,
                          };

                          var position = locations[i].where;
                          var title = locations[i].title;
                          var stopID = locations[i].stopID;

                          var marker = new google.maps.Marker({
                                position: position,
                                title: title,
                                animation: google.maps.Animation.DROP,
                                icon: 'img/maps-and-flags.png',
                                id: stopID,
                          });

                          markers.push(marker);
                          locations_wholeArea.push(locations[i]);

                      }//讀出OpenData的for迴圈結束
                      
                      global_markers = markers;  //所有marker存進全域變數

                      var largeInfowindow = new google.maps.InfoWindow();

                      var defaultIcon = makeMarkerIcon('default');
                      var highlightedIcon = makeMarkerIcon('highlight');

                      var startPoint, ternimalPoint;    //用來儲存記起終點的變數 區域變數

                      for(let k=0; k<markers.length; k++)
                      {
                            old_clickListener[k] = markers[k].addListener('click', function (){
                                  //消除過去紀錄
                                  if(ifRoadChanged==true && directionsDisplay!=undefined){
                                     directionsDisplay.setMap(null);
                                  }

                                  populateInfoWindow(this, largeInfowindow);
                                  document.getElementById("showStartPoint-text").textContent = this.title;
                                  //將目前這個marker的經緯度設給送出紐 加tag
                                  $("#submitButton").data('thisPoint',this);
                                  ToolBarAnimation(); //物件動畫
                                  //計算[目前位置(小黃人)去到marker]
                                  //存成區域變數方便後續計算
                                  startPoint = currentPost.position;
                                  ternimalPoint = this.position;  //將終點設置為當前marker位置
                                  //更新全域變數
                                  dynamic_StartPoint = currentPost; //型別marker
                                  dynamic_EndPoint = this; //this marker，型別marker
                                  theClickedMarker = this;  //目前點擊的marker，存進全域變數

                                  //開始計算[目前位置(小黃人)去到marker]
                                  distanceMatrixService.getDistanceMatrix({
                                      origins: [startPoint],
                                      destinations: [ternimalPoint],
                                      travelMode: google.maps.TravelMode.WALKING,
                                      unitSystem: google.maps.UnitSystem.IMPERIAL,
                                      avoidHighways: false,
                                      avoidTolls: false
                                  }, function(response, status) {
                                        if (status !== google.maps.DistanceMatrixStatus.OK) {$.alert("發生錯誤:( 原因為: "+status);}
                                        else {
                                            var result = response.rows[0].elements[0];
                                            if(result.status==="OK"){
                                                //時間與距離計算完成
                                                var distanceText = result.distance.value;  //meter
                                                var durationNum =  result.duration.value; //seconds
                                                if(Math.ceil(durationNum/60)<15){  
                                                    //低於15分鐘
                                                    $.alert("走路過去大約"+Math.ceil(durationNum/60)+"分鐘，\n有點小遠喔 :)");
                                                    //創建另個按鈕
                                                    var newNavi= $('<button class="msg-start_navi"/>');
                                                    $(".msgbox-buttons").append(newNavi);
                                                    $(".msg-start_navi").append( $('<div class="clear></div>'));
                                                    $(".msgbox-ok").text("關閉");
                                                    $(".msg-start_navi").text("設為起點");
                                                    //如果點擊[關閉]
                                                    //須把目的輸入欄鎖死
                                                    $(".msgbox-ok").click(function() {
                                                        //將起點文字標示為未選定
                                                        document.getElementById("showStartPoint-text").textContent = "尚未選擇";
                                                        ifLockInputflag = true;
                                                    });

                                                    //如果點擊[設為起點]按鈕
                                                    $(".msg-start_navi").click(function() {
                                                        changeStartPointFlag = true;
                                                        checkIfChange(changeStartPointFlag, map, old_clickListener);  //自定義函數 確認狀態
                                                        dynamic_EndPoint = theClickedMarker; //更新終點，型別marker
                                                        currentPost.setMap(null);//將原有小黃人從地圖上取消
                                                        directionsDisplay.setMap(null); //把舊路徑消除掉
                                                        //計費計時和路徑指示都消除(下面順序不可動)
                                                        showRouteInstructions(null);
                                                        showTimeData(null);
                                                        //右邊顯示欄內插入一張圖
                                                        var pic = "<img src='img/typing.png' id='needTyping' alt=''>";
                                                        $("#detailDirectionArea-text").append(pic);
                                                        //解開輸入欄
                                                        ifLockInputflag = false;
                                                    });

                                                }
                                                else{
                                                    $.alert("走路過去大約"+Math.ceil(durationNum/60)+"分鐘，\n太遠了不建議前往 :(");
                                                    $(".msgbox-ok").text("關閉");
                                                    $(".msgbox-ok").css("width", "100%");
                                                    document.getElementById("showStartPoint-text").textContent = "尚未選擇";
                                                    dynamic_EndPoint = theClickedMarker; //更新終點，型別marker
                                                    changeStartPointFlag = false; //起點未改變，旗子重置
                                                    checkIfChange(changeStartPointFlag, map, null);  //自定義函數 確認狀態
                                                    ifLockInputflag = true; 
                                                }

                                                //顯示計時與計費(自定義函數)
                                                showTimeData(durationNum);
                                                //路徑指示
                                                var directionsService = new google.maps.DirectionsService;
                                                var desinatonBikeStop = ternimalPoint; //=bike stop
                                                directionsService.route({
                                                      origin: startPoint,
                                                      destination: desinatonBikeStop,
                                                      travelMode: google.maps.TravelMode.WALKING,
                                                }, function(response, status) {
                                                      if (status === google.maps.DirectionsStatus.OK) {
                                                          directionsDisplay = new google.maps.DirectionsRenderer({
                                                              map: map,
                                                              directions: response,
                                                              draggable: true,
                                                              polylineOptions: {
                                                                    strokeColor: '#1AA260'
                                                              }
                                                          });
                                                          //把default起終點消掉
                                                          directionsDisplay.setMap(map);
                                                          directionsDisplay.setOptions( { suppressMarkers: true } );
                                                          //開始把所有路徑指示標上去
                                                          //先創建html tag
                                                          var oneAsignmentBox ="<div class=\"oneAsignmentBox\"><div class=\"oneAsignmentBox-text\"></div><div class=\"oneAsignmentBox-TDarea\"><div class=\"oneAsignmentBox-TDarea-time\"></div><div class=\"oneAsignmentBox-TDarea-distance\"></div></div><div class=\"oneAsignmentBox-ifWarn\"><div class=\"oneAsignmentBox-ifWarn-pic\"></div><div class=\"oneAsignmentBox-ifWarn-text\"></div></div><div class=\"clear\"></div></div>";
                                                          var totleHTMLtag="";
                                                          for(let l=0; l<response.routes[0].legs[0].steps.length; l++){
                                                              totleHTMLtag=totleHTMLtag+oneAsignmentBox;
                                                          }
                                                          //創建框架
                                                          document.getElementById('detailDirectionArea-text').innerHTML = totleHTMLtag;
                                                          //顯示路徑指示(自定義函數)
                                                          showRouteInstructions(response);
                                                      }
                                                      else {$.alert("路徑指示發生錯誤:( 原因為: "+status);}
                                                  });//畫完地圖上的路徑線條                                             

                                            }   //if(計算小黃人~指定bike stop的result.status==="OK")
                                            else{
                                                $.alert("計算取得最近腳踏車的過程中發生錯誤:( (原因是:"+status+")");
                                            }
                                        } 
                                  });//成功計算+畫完圖

                                  ifRoadChanged = true;

                                  
                            }); //marker的[click Listener]結束

                            markers[k].addListener('mouseover', function() {
                                this.setIcon(highlightedIcon);
                            });
                            markers[k].addListener('mouseout', function() {
                                this.setIcon(defaultIcon);
                            });
                      } // markers[k]結束
                      AllClickListener = old_clickListener; //存進全域變數(應是陣列, 包含對所有marker的監聽)

                  } //success: function(xml) END

                }); //ajax END

                //按下取得腳踏車紐
                $('#clickForBike').click(function() {
                    //關閉提示窗
                    nowInfowindow.close(map, currentPost);

                    if ( $(this).hasClass('clicked') ) {
                            // 第二次按了
                        for (let i=0; i<markers.length; i++) {
                              markers[i].setMap(null);
                        }
                        $(this).removeClass('clicked');
                    }
                    else {
                        $(this).last().addClass('clicked');
                        for (let i=0; i<markers.length; i++) {
                              markers[i].setMap(map);
                              markers[i].setAnimation(google.maps.Animation.DROP);
                        }
                    }
                });
                //按下送出地址
                $('#submitButton').click(function() {
                    if( document.getElementById('yourterminalPoint-keiIn').value != "" ){
                        //只要有按送出就算一次搜尋
                        repeatKeyin++;  
                        ifRoadChanged = true ;
                        //清空原有顯示
                        showTimeData(null);
                        showRouteInstructions(null);
                        //清空上一輪的搜尋結果(如果有)
                        clearMap(map);
                        //開始處理地址對應到腳踏車的計算
                        findNearbyBike(map);
                    }
                    else{
                        $.alert("尚未輸入地址 :)");
                    }

                });

                //為是否鎖定輸入欄建立listener
                $("#yourterminalPoint-keiIn").click(function() {
                    ifLockInput(ifLockInputflag); 
                });                      
              
              }
              else{
                //定位發現不在高雄
                $.alert("發現您現在位置不在高雄，無法使用本服務 :( \n<p style='font-size: 0.8em;'>（Chrome的sensors功能可修改當前經緯度。或者使用以下按鈕。）</p>");
                $(".msgbox-ok").text("關閉");
                //創建另個按鈕
                var newDemo= $('<button class="msg-demo" />');
                $(".msgbox-buttons").append(newDemo);
                $(".msg-demo").append( $('<div class="clear></div>'));
                $(".msg-demo").text("使用預設高雄地址");
                //如果點擊[模擬]
                //須把目的輸入欄鎖死
                $(".msg-demo").click(function() {
                    ifDemo = true;
                    initMapPathPlanPage();
                });

              }

          //navigator END
          }, function() {
              handleNoGeolocation(browserSupportFlag);
          });

      }
      // Browser doesn't support Geolocation
      else {
          browserSupportFlag = false;
          handleNoGeolocation(browserSupportFlag);
      }
    } //直接查詢 所有動作END
    else
    {
      //是跳頁過來
      console.log("跨頁過來");
      console.log("是否模擬地址: "+ifDemo);

      url = location.href;
      var temp = url.split("?");
      var stopID = temp[1].split("=");    //temp[1] = "stopID=123"  
      var theStartBikeID = stopID[1].replace("#","");       //stopID[1] = "123" 再去除#

      var locations=[];

      var defaultIcon = makeMarkerIcon('default');
      var highlightedIcon = makeMarkerIcon('highlight');

      $.ajax({
        type: "GET",
        url: "./opendata/bikeInfo.xml",
        dataType: "xml",
        success: function(xml){
            var JSONobject = xmlToJson(xml);

            var length = JSONobject.BIKEStationData.BIKEStation.Station.length;
            for (let i=0; i<length; i++){
                var bike_lat = parseFloat(JSONobject.BIKEStationData.BIKEStation.Station[i].StationLat);
                var bike_lng = parseFloat(JSONobject.BIKEStationData.BIKEStation.Station[i].StationLon);
                locations[i] = {
                    'title': JSONobject.BIKEStationData.BIKEStation.Station[i].StationName,
                    'where': {lat: bike_lat, lng: bike_lng},
                    'availBike': JSONobject.BIKEStationData.BIKEStation.Station[i].StationNums1,
                    'availSPace': JSONobject.BIKEStationData.BIKEStation.Station[i].StationNums2,
                    'stopID': JSONobject.BIKEStationData.BIKEStation.Station[i].StationID,
                };

                var position = locations[i].where;
                var title = locations[i].title;
                var stopID = locations[i].stopID;

                var marker = new google.maps.Marker({
                      position: position,
                      title: title,
                      animation: google.maps.Animation.DROP,
                      icon: 'img/maps-and-flags.png',
                      id: stopID,
                });

                markers.push(marker);
                locations_wholeArea.push(locations[i]);
            }//讀出OpenData的for迴圈結束
            global_markers = markers;

            //look for certain bike
            for(let m=0; m<global_markers.length; m++){
              if(global_markers[m].id == theStartBikeID){
                  dynamic_StartPoint = global_markers[m];
                  document.getElementById("showStartPoint-text").textContent = global_markers[m].title;
                  initialLocation = global_markers[m].position; //高雄市四維行政中心;
                  //先把所有標的指向選擇的站點
                  dynamic_StartPoint = global_markers[m];
              }
            }
            dynamic_EndPoint = null;
            theClickedMarker = null;
            AllClickListener = null;  //沒有set up all markers，listener暫存為空
            ToolBarAnimation(); //物件動畫

            //設置小黃人(此時的小黃人是站點)
            var now = {
                url: "img/currentPoint.png", // url
                scaledSize: new google.maps.Size(80, 80), // scaled size
            }; 
            var newCurrentPost = new google.maps.Marker({
                position: dynamic_StartPoint.position,
                map: map,
                icon: now,
                animation: google.maps.Animation.DROP,
            });
            newCurrentPost.setMap(map);
            map.setCenter(initialLocation);

            //更新畫面上[起點]的顯示文字
            document.getElementById("showStartPoint-text").textContent = dynamic_StartPoint.title;
            //輸入目的地相關設定
            iniInputAutocomplete();   //初始化中已設定[改變地點]的監聽
            ifLockInput(false);

            //按下送出地址
            $('#submitButton').click(function() {
                if( document.getElementById('yourterminalPoint-keiIn').value != "" ){
                    //只要有按送出就算一次搜尋
                    repeatKeyin++;  
                    ifRoadChanged = true ;
                    //清空原有顯示
                    showTimeData(null);
                    showRouteInstructions(null);
                    //清空上一輪的搜尋結果(如果有)
                    clearMap(map);
                    //開始處理地址對應到腳踏車的計算
                    findNearbyBike(map);
                }
                else{
                    $.alert("尚未輸入地址 :)");
                }

            });

           
        } //success END
      }); //ajax END





    } //跳頁查詢 所有動作END

    console.log("initMapPathPlanPage END");

  }  //initMapPathPlanPage END



  function initMap(){
    map = new google.maps.Map(document.getElementById('mapArea'), {
        center: {lat: 22.620424, lng: 120.312047},
        zoom: 17,
        styles: MapStyles,
        mapTypeControl: false,
    });
  }  

  function handleNoGeolocation(errorFlag) {
    if (errorFlag == true) {
        $.alert("地圖定位失敗 :( ");
    }
    else {
        $.alert("您的瀏覽器似乎不支援定位服務 :( ");
    }
    initialLocation = new google.maps.LatLng(22.620424, 120.312047); //高雄市四維行政中心;
    map.setCenter(initialLocation);
  }

  function toggleBounce() {
    if (currentPost.getAnimation() !== null) {
        currentPost.setAnimation(null);
    }
    else {
        currentPost.setAnimation(google.maps.Animation.BOUNCE);
    }
  }

  function ToolBarAnimation(){
    //原hover要取消
    $('#lookForBike').unbind('mouseenter mouseleave');
    var addApic = "<img src='img/bike-white.png' id='newAddBike'>";
    $(function() {
        //上面工具列的動畫
        $('#lookForBike').css('animation', 'bikeButtonreduce_start 1s forwards');
        $('#showStartPoint').css('animation', 'startPoint_start 1s forwards');
        $('#yourterminalPoint').css('animation', 'ternimalPoint_start 1s forwards');
        //$('.outlinContainBox').css('border-bottom', '1px solid #9DC3E6');
        //旗子
        $('#flag01').css('animation', 'flag01_part2 1s forwards');
        $('#flag02').css('animation', 'flag02_part2 1s forwards');
        $("#yourterminalPoint-keiIn").removeClass('isHidden');
        $("#submitButton").removeClass('isHidden');
        //物件調整
        $('#lookForBike-text').last().addClass('isHidden');
        $('#clickForBike').css('display', 'none');
        //移動動畫結束才添加腳踏車圖案                                    
        $('#lookForBike').one("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd", function(){
            $(this).append(addApic);
        });
    });

  }

  //XML to JSON
  function xmlToJson(xml){
        // Create the return object
        var obj = {};

        if (xml.nodeType == 1) { // element
        // do attributes
          if (xml.attributes.length > 0) {
              obj["@attributes"] = {};
              for (let j=0; j<xml.attributes.length; j++) {
                  var attribute = xml.attributes.item(j);
                  obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
              }
          }
        }
        else if (xml.nodeType == 3) { // text
          obj = xml.nodeValue;
        }

        // do children
        // If just one text node inside
        if (xml.hasChildNodes() && xml.childNodes.length === 1 && xml.childNodes[0].nodeType === 3) {
            obj = xml.childNodes[0].nodeValue;
        }
        else if (xml.hasChildNodes()) {
          for(let i=0; i<xml.childNodes.length; i++) {
              var item = xml.childNodes.item(i);
              var nodeName = item.nodeName;
              if (typeof(obj[nodeName]) == "undefined")
              {
                obj[nodeName] = xmlToJson(item);
              }
              else
              {
                  if (typeof(obj[nodeName].push) == "undefined") {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                  }
                  obj[nodeName].push(xmlToJson(item));
              }
          }
        }
        return obj;
  };


  function makeMarkerIcon(situation) {
    var newIcon;
    if (situation.match('default')) {
        newIcon = new google.maps.MarkerImage(
            'img/maps-and-flags.png',
            new google.maps.Size(55, 55),
            new google.maps.Point(0, 0),
            new google.maps.Point(25, 40),
            new google.maps.Size(40, 40));
        return newIcon;
    }
    else{ //highlight
        newIcon = new google.maps.MarkerImage(
            'img/placeholder.png',
            new google.maps.Size(55, 55),
            new google.maps.Point(0, 0),
            new google.maps.Point(25, 40),
            new google.maps.Size(40, 40));
        return newIcon;
    }
  }


  function populateInfoWindow(marker, infowindow) {
        var stopID = marker.id;
        var availBike, availSPace;
        //console.log(locations_wholeArea);   //OK取到值
        var showText ="";
        for(let j=0; j<locations_wholeArea.length; j++){
            if( parseInt(locations_wholeArea[j].stopID) ==stopID){
              availBike = locations_wholeArea[j].availBike;
              availSPace = locations_wholeArea[j].availSPace;
            }
        }
        showText = "<br><h2 style='font-weight: bold; font-size: 1em;'>"+marker.title+"</h2><br>"
              +"<p>空車數: "+availBike+"，空位數: "+availSPace+"</p>";
        infowindow.setContent(showText);
        infowindow.marker = marker;

        infowindow.addListener('closeclick', function() {
          infowindow.marker = null;
        });

        infowindow.open(map, marker);
        
  }


  //時間換算
  function secondsToTime(secs){
    var hours = Math.floor(secs / (60 * 60));
    var divisor_for_minutes = secs % (60 * 60);

    var minutes = Math.floor(divisor_for_minutes / 60);

    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);

    var obj = {
        "h": hours,
        "m": minutes,
        "s": seconds
    };
    return obj;
  }

  function removeHTMLtag(String){
    String = String.replace(/<br>/gi, "\n");
    String = String.replace(/<p.*>/gi, "\n");
    String = String.replace(/<a.*href="(.*?)".*>(.*?)<\/a>/gi, " $2 (Link->$1) ");
    String = String.replace(/<(?:.|\s)*?>/g, "");
    String = String.replace("&nbsp;", "");
    return String;
  }


  function LoadDangerRoad(map){

      //手動輸入的原始資料
      var accidents1 = {county: "前鎮區", road1: "中山四路", road2: "中安路", intersectLat: "22.5803421", intersectLng: "120.3292589"};
      var accidents2 = {county: "左營區", road1: "民族一路", road2: "大中一路", intersectLat: "22.6789777", intersectLng: "120.3192548"};
      var accidents3 = {county: "前鎮區", road1: "中山四路", road2: "鎮海路", intersectLat: "22.6447198", intersectLng: "120.3145048"};
      var accidents4 = {county: "小港區", road1: "中山四路", road2: "平和東路", intersectLat: "22.5700042", intersectLng: "120.3382657"};
      var accidents5 = {county: "三民區", road1: "民族一路", road2: "十全一路", intersectLat: "22.5768225", intersectLng: "120.3322339"};
      var accidents6 = {county: "前鎮區", road1: "中山四路", road2: "金福路", intersectLat: "22.5859382", intersectLng: "120.3190271"};
      var accidents7 = {county: "前鎮區", road1: "中山四路", road2: "凱旋四路", intersectLat: "22.5955287", intersectLng: "120.3161467"};
      var accidents8 = {county: "前鎮區", road1: "中山三路", road2: "凱旋四路", intersectLat: "22.5989113", intersectLng: "120.3200378"};
      var accidents9 = {county: "前鎮區", road1: "中山四路", road2: "鎮中路", intersectLat: "22.5884525", intersectLng: "120.3222078"};
      var accidents10 = {county: "前鎮區", road1: "中山四路", road2: "五甲三路", intersectLat: "22.5927466", intersectLng: "120.3187842"};
      dangerRoadIntersection.push(accidents1,accidents2,accidents3,accidents4,accidents5,accidents6,accidents7,accidents8,accidents9,accidents10);


  } //function END



  function calBikeFeeGernal(minutes){
    var fee;
    if(minutes<=30){
      fee = 0;
    }
    else if(minutes<=60 && minutes>30){
      fee = 5;
    }
    else if(minutes<=90 && minutes>60){
      fee = 15;
    }
    else if(minutes<=120 && minutes>90){
      fee = 35;
    }
    else if(minutes<=150 && minutes>120){
      fee = 55;
    }
    else if(minutes<=180 && minutes>150){
      fee = 75;
    }
    else{
      fee = 75 + ((minutes-180)/30).toFixed(0)*20;
      if(fee>=910){
        fee=910;
      }
    }
    return fee;

  }

  function calBikeFeeSpecial(minutes){
    var fee;
    if(minutes<=30){
      fee = 0;
    }
    else if(minutes<=60 && minutes>30){
      fee = 0;
    }
    else if(minutes<=90 && minutes>60){
      fee = 10;
    }
    else if(minutes<=120 && minutes>90){
      fee = 30;
    }
    else if(minutes<=150 && minutes>120){
      fee = 50;
    }
    else if(minutes<=180 && minutes>150){
      fee = 70;
    }
    else{
      fee = 70 + ((minutes-180)/30).toFixed(0)*20;
      if(fee>=910){
        fee=910;
      }
    }
    return fee;

  }


  function showTimeData(seconds){

    if(seconds==null){
        $(".expectValueArea").last().addClass('isHidden');  //  將該區塊隱藏
    }
    else{
        //物件更動
        $(".expectValueArea").removeClass('isHidden');
        //顯示計時與計費
        var tempTimee = secondsToTime(seconds);
        document.getElementById("calHour").textContent = tempTimee.h;
        document.getElementById("calMinu").textContent = tempTimee.m;
        //
        var gCost = calBikeFeeGernal(Math.ceil(seconds/60));  //總秒數，向上取整數成分鐘，calBikeFeeGernal()的input是分鐘
        var sCost = calBikeFeeSpecial(Math.ceil(seconds/60));  //總秒數，向上取整數成分鐘，calBikeFeeGernal()的input是分鐘

        document.getElementById("gCost").textContent = " "+gCost.toString()+"元";
        document.getElementById("sCost").textContent = " "+sCost.toString()+"元";
    }
  }

  function showRouteInstructions(response){
    console.log(response);
    //input是google response物件
    //以下皆陣列
    var Apart = document.getElementsByClassName('oneAsignmentBox-text');
    var Bpart = document.getElementsByClassName('oneAsignmentBox-TDarea-time');
    var Cpart = document.getElementsByClassName('oneAsignmentBox-TDarea-distance');
    var Dpart = document.getElementsByClassName('oneAsignmentBox-ifWarn-pic');
    var Epart = document.getElementsByClassName('oneAsignmentBox-ifWarn-text');
    
    if(response==null){
      //刪除所有已存在的路徑指示
      var father = document.querySelector("#detailDirectionArea-text"); 
      var child = father.lastElementChild;  
      while (child) { 
            father.removeChild(child); 
            child = father.lastElementChild; 
      } 

    }
    else{

      //意外標示相關物件
      var isLocationOnEdge = google.maps.geometry.poly.isLocationOnEdge;
      
      var path = response.routes[0].overview_path;
      var polyline = new google.maps.Polyline({
            path: path
      })
      var addWarmPic="<img src=\"img/attention2.png\">";

      //先清清除掉地圖上的危險路段警示
      for(let w=0; w<allWarmMarker.length; w++){
          allWarmMarker[w].setMap(null);
      }

      for(let a=0; a<response.routes[0].legs[0].steps.length; a++){
          
          var tempText = response.routes[0].legs[0].steps[a].instructions;
          tempText = removeHTMLtag(tempText);
          Apart[a].textContent = tempText;

          var path_eachSteps = response.routes[0].legs[0].steps[a].path;
          var polyline_eachSteps = new google.maps.Polyline({
                path: path_eachSteps
          })
          for (var b=0; b<dangerRoadIntersection.length; b++) {
              //string to float, 小數7位
              var tempLat = parseFloat(dangerRoadIntersection[b].intersectLat).toFixed(7);
              var tempLng = parseFloat(dangerRoadIntersection[b].intersectLng).toFixed(7);
              var accidentLatLng = new google.maps.LatLng(tempLat, tempLng);
              
              if(isLocationOnEdge(accidentLatLng, polyline_eachSteps, 10e-4)) {                  
                  Dpart[a].innerHTML = addWarmPic;
                  Epart[a].textContent= "危險路段";
              }

          }


          var tempTime = response.routes[0].legs[0].steps[a].duration.value;
          if(tempTime>=60){   //超過1分鐘
              Bpart[a].textContent = (response.routes[0].legs[0].steps[a].duration.value/60).toFixed(0)+" 分";
          }
          else{
              Bpart[a].textContent = (response.routes[0].legs[0].steps[a].duration.value)+" 秒";
          }

          var tempDis = response.routes[0].legs[0].steps[a].distance.value;
          if(tempDis>=500){ //500公尺以上
              Cpart[a].textContent = (tempDis/1000).toFixed(0) + " 公里"; //四捨五入 小數後一位
          }
          else{
              Cpart[a].textContent = tempDis.toFixed(0) + " 公尺";
          }





      }
    }


  } //function showRouteInstrcutions END

  function checkIfChange(changeStartPointFlag, map, allOldListener){
    if(changeStartPointFlag==false){
      //未選定新地點，什麼也不做
    }
    else{
      console.log("新起點！");
      iniInputAutocomplete(); //執行輸入欄的自動功能
      //更新幾個定位點(都是型別marker)
      theClickedMarker = dynamic_EndPoint;
      dynamic_StartPoint = dynamic_EndPoint;  //被選定的終點變為新起點
      dynamic_EndPoint = null;                //未輸入地址
      //重置路徑標旗
      ifRoadChanged = false;
      //地圖顯示改變: 取消all marker -> set new center -> 標註新起點(小黃人) -> alert window("輸入地址")
      //消除所有marker
      for(let a=0; a<global_markers.length; a++){
         global_markers[a].setMap(null);
         if(AllClickListener!=null){
            AllClickListener[a].remove();  //cancel all marker's click listener
         }
         
      }

      map.setCenter(theClickedMarker.position);

      var now = {
          url: "img/currentPoint.png", // url
          scaledSize: new google.maps.Size(80, 80), // scaled size
      }; 
      var newCurrentPost = new google.maps.Marker({
          position: dynamic_StartPoint.position,
          map: map,
          icon: now,
          animation: google.maps.Animation.DROP,
      });
      newCurrentPost.setMap(map);

    }
  }

  function judgeBetween(target, upper, lower){
    var result;
    if(target<=upper&&target>=lower){result =true;}
    else {result = false;}

    return result;
  }

  function ifLockInput(flag){
    var startPointText = document.getElementById("showStartPoint-text").textContent;
    if(flag==true){
      //沒選起點，要鎖死輸入欄
      $.alert("你還沒選定起點站喔 :)");
      $(".msgbox-ok").text("關閉");
      $(".msgbox-ok").css("width", "100%");
    }
    else{
      //有起點

    }
  }

  function iniInputAutocomplete(){
      //建立自動化輸入欄的偵測邊界(高雄市的南北經緯位置)，第一次載入的時候會error，可放置不理
      var defaultBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(22.28, 120.1032),
            new google.maps.LatLng(23.28, 121.0115));      
      var input = document.getElementById('yourterminalPoint-keiIn');
      var options = {
            bounds: defaultBounds,
            componentRestrictions: {country: 'tw'}
      };
      //types指向預測類型是地址(e.g.岡山區130號)
      autocomplete = new google.maps.places.Autocomplete(input, options);
      autocomplete.setOptions({strictBounds: true});
      //每次新搜的地址，存入全域變數
      google.maps.event.addListener(autocomplete,'place_changed',function(){
          autocomplete.getPlace();  //取自動化產生的選項，應無html tag問題，getPlace() Return Value:  PlaceResult
      });
  }

  function findNearbyBike(map){
    var address = removeHTMLtag(document.getElementById("yourterminalPoint-keiIn").value);//去除網頁標籤+基礎判斷地址是否在高雄

    var geocoder = new google.maps.Geocoder(); //解析地址成經緯度    
    var place = autocomplete.getPlace();            //autocomplete取得的地點已經含有經緯度
    //var circle;

    var countBikesAroundDes=0;  //有多少個腳踏車站在目的地附近

    //確實為高雄地址
    if(address.indexOf("高雄")!=-1){
      //要是搜不到相關結果
      if (!place.geometry) {
        $.alert("沒有相關結果：'" + place.name + "'");
        return;
      }
      else{
        global_circle = produceCircle(place.geometry.location, map); //產生圓形，並轉存全域變數

        //焦點移到輸入的目的地
        map.setCenter(place.geometry.location);
        map.setZoom(16);

        //輸入的目的地轉成marker
        var target_s = {
            url: "img/target.png", // url
            scaledSize: new google.maps.Size(55, 55), // scaled size
        }; 
        var target = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            icon: target_s,
            animation: google.maps.Animation.DROP,
        });
        target.setMap(map);
        global_target = target; //轉存全域變數
        
        var infowindow = new google.maps.InfoWindow({});
        infowindow.setContent("方圓500公尺（走路10~15分鐘）");
        infowindow.open(map, target); // open at marker's location

      
        //計算腳踏車列表中，與目的地距離低於500公尺者
        for(let a=0; a<global_markers.length; a++){
            //清除每個marker的原有點擊監聽
            if(computeDistanceBetween2Marker(global_markers[a],target)){
              //計算值返回true/false，true=確實少於等於500公尺
              global_markers[a].setMap(map);
              var newclickListener = global_markers[a].addListener('click', function(){
                infowindow.close(map, target);
                populateSetTargetInfo(this, map); //產生冒出的視窗
                //起點不動，浮動終點改變，被點擊點改變
                dynamic_EndPoint = this; //this marker，型別marker
                theClickedMarker = this;
              });
              AllClickListener = newclickListener; //更新全域變數
              countBikesAroundDes++;
            }

        }//計算完畢(範圍500公尺內的腳踏車)(run完所有marker)
        
        global_markers.push(target);//記得要刪掉//把目前目的地marker(使用者輸入的地址)也加進去

        if(countBikesAroundDes==0){
          //完成所有計算結果發現沒有腳踏車在附近
          $.alert("附近沒有腳踏車站，\n建議重輸地址 :(");
          $(".msgbox-ok").text("關閉");
          $(".msgbox-ok").css("width", "100%");
        }

      }  //如果有搜尋到相關結果 END

    } //搜尋關鍵字中不含高雄 END
    else{
      $.alert("搜尋範圍可能超出高雄市 :(");
      $(".msgbox-ok").text("關閉");
      $(".msgbox-ok").css("width", "100%");
    }


  }

  function computeDistanceBetween2Marker(marker1, marker2){
    var distances_meter; 
    var result;

    var path = [marker1.getPosition(), marker2.getPosition()];
    //計算以地球半徑(預設)，兩地經緯相差__degree
    distances_meter = google.maps.geometry.spherical.computeDistanceBetween(path[0], path[1]);
    if(distances_meter<=500){result=true;}
    else{result=false;}

    return result;

  }


  function populateSetTargetInfo(marker, map){
    //根據marker.id查詢空車數與空位數，locations_wholeArea是儲存opendata資料的全域變數
    var availBike, availSPace, showText="";
    var infowindow = new google.maps.InfoWindow();

    if(ifSetFinal==true){
      infowindow.close(map, marker);
    }
    //取得需要的數值
    for(let j=0; j<locations_wholeArea.length; j++){
        if( parseInt(locations_wholeArea[j].stopID) ==marker.id){
          availBike = locations_wholeArea[j].availBike;
          availSPace = locations_wholeArea[j].availSPace;
        }
    }

    var htmlContent = 
    "<div class='setTargetInfoContainer'>"+
      "<div class='setTargetTitle'>"+marker.title+"</div>"+
      "<div class='setTargetBikesNum'>"+
          "<div class='b_available'>空車數："+availBike+"</div>"+
          "<div class='b_space'>空位數："+availSPace+"</div>"+
          "<div class='clear'></div>"+
      "</div>"+
      "<div class='setTargetFunctions'>"+
          "<div id='setTarget_choose' onclick='handler_finalPath()'>設為終點</div>"+
      "</div>"+  
    "</div>";
    infowindow.setContent(htmlContent);
    infowindow.open(map,marker);
    dynamic_taInfowindow = infowindow;    //轉存全域變數

    infowindow.addListener('closeclick',function(){
      infowindow.close(map, marker);
    });

  }


  
  function handler_finalPath(){

    ifSetFinal = true;
    dynamic_taInfowindow.close(map, theClickedMarker);    //關掉當前目的地的infowindow
    var gobj_directionService = new google.maps.DirectionsService;  //路徑指示的時候需要
    
    if(ifRoadChanged==true && gobj_directionsDisplay!=undefined){
       gobj_directionsDisplay.setMap(null);
    }



    gobj_directionService.route({
            origin: dynamic_StartPoint.position,
            destination: dynamic_EndPoint.position,
            travelMode: google.maps.TravelMode.WALKING,
            avoidHighways: true,
            avoidTolls: true,
        }, function(response, status) {
            if (status === google.maps.DirectionsStatus.OK){
                //畫圖
                gobj_directionsDisplay = new google.maps.DirectionsRenderer({
                      map: map,
                      directions: response,
                      draggable: true,
                      polylineOptions: {strokeColor: '#1AA260'}
                });
                
                //把default起終點消掉
                gobj_directionsDisplay.setMap(map);
                gobj_directionsDisplay.setOptions( { suppressMarkers: true } );
                map.setZoom(20);
                //先創建html tag
                var oneAsignmentBox ="<div class=\"oneAsignmentBox\"><div class=\"oneAsignmentBox-text\"></div><div class=\"oneAsignmentBox-TDarea\"><div class=\"oneAsignmentBox-TDarea-time\"></div><div class=\"oneAsignmentBox-TDarea-distance\"></div></div><div class=\"oneAsignmentBox-ifWarn\"><div class=\"oneAsignmentBox-ifWarn-pic\"></div><div class=\"oneAsignmentBox-ifWarn-text\"></div></div><div class=\"clear\"></div></div>";
                var totleHTMLtag="";
                for(let a=0; a<response.routes[0].legs[0].steps.length; a++){
                    totleHTMLtag=totleHTMLtag+oneAsignmentBox;
                }
                //創建框架
                document.getElementById('detailDirectionArea-text').innerHTML = totleHTMLtag;
                //設置價錢與時間資訊
                var totalSec = (response.routes[0].legs[0].duration.value/3).toFixed(0);    
                //google結果是步行 腳踏車時間約1/3                  
                showRouteInstructions(response); //處理路徑指示
                showTimeData(totalSec);//顯示資費與時間
                //流程走到終點                
            }
            else{
              $.alert("計算路程的過程中發生錯誤 :(\n"+"<span style='font-size:0.5em;'>"+status+"</span>");
            }

    });//gobj_directionService.route END
    repeatKeyin++;
    ifRoadChanged = true;   //重置標旗
  }

  function clearMap(map){
    //clear all markers
    for(let i=0; i<global_markers.length; i++){
          global_markers[i].setMap(null);
    }
    //刪除陣列中最後一個item(使用者輸入的目的地所形成的marker)
    global_markers.slice(0, -1);
    
    //clear previous circle
    if(repeatKeyin>0 && global_circle!=undefined){
      //非第一次搜尋
      global_circle.setMap(null);
      global_target=null; //清空暫存
    }

  }

  function produceCircle(circle_position, map){
    
    var drawCircle = new google.maps.Circle({
        center: circle_position,
        radius: 500,
        strokeOpacity: 0,
        fillColor: '#ce6ee7',
        fillOpacity: 0.35,
        map: map
    });

    return drawCircle;

  }
