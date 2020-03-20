  //引入css
  ('head').append('<link rel="stylesheet" href="all.css" type="text/css" />');

  var map;
  var initialLocation;
  var K_city_government = new google.maps.LatLng(22.620424, 120.312047); //高雄市四維行政中心
  var browserSupportFlag =  new Boolean();
  var currentPost;  //現在位置
  var situation = 'default';  //標記重點用

  var polygon = null;// This global polygon variable is to ensure only ONE polygon is rendered.
  var locations_wholeArea = [];  //全域變數
  var timeout=600;



  //初始化地圖
  function initMapPathPlanPage() {

    var markers = []; //區域變數

    // Create a styles array to use with the map.
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
    // Constructor creates a new map - only center and zoom are required.
    map = new google.maps.Map(document.getElementById('mapArea'), {
        center: {lat: 22.620424, lng: 120.312047},
        zoom: 17,
        styles: MapStyles,
        mapTypeControl: false,
    });

    locations_wholeArea=[];

    // 抓到所在位置
    if(navigator.geolocation) {
        browserSupportFlag = true;
        navigator.geolocation.getCurrentPosition(function(position){
            initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(initialLocation); //將地圖中心設置成所在位置
            //set current marker
            currentPost = new google.maps.Marker({
                position: initialLocation,
                map: map,
                icon: 'img/currentPoint.png',
                animation: google.maps.Animation.DROP,
            });
            currentPost.addListener('click', toggleBounce);
            currentPost.setMap(map);
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
                  for (var i=0; i<length; i++){
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

                  var largeInfowindow = new google.maps.InfoWindow();

                  var defaultIcon = makeMarkerIcon('default');
                  var highlightedIcon = makeMarkerIcon('highlight');

                  var accidentsList = Load2OpenDataAndSave(); //危險路段

                  for(var k=0 ; k<markers.length; k++)
                  {
                        var thisPos = markers[k].position;

                        markers[k].addListener('click', function(){

                              populateInfoWindow(this, largeInfowindow);
                              document.getElementById("showStartPoint-text").textContent = this.title;
                              //將目前這個marker的經緯度設給送出紐 加tag
                              var tempObj = this.position;
                              $("#submitButton").data('thisPoint',this);
                              //alert( $( "#submitButton").data(tempObj) );
                              //原hover要取消
                              $('#lookForBike').unbind('mouseenter mouseleave');
                              $(function() {
                                  //上面工具列的動畫
                                  $('#lookForBike').css('animation', 'bikeButtonreduce_start 1s forwards');
                                  //$('#lookForBike-pic').css('animation', 'bikePic_ani 1s forwards');
                                  $('#showStartPoint').css('animation', 'startPoint_start 1s forwards');
                                  $('#yourterminalPoint').css('animation', 'ternimalPoint_start 1s forwards');
                                  //物件調整
                                  $('#lookForBike-text').last().addClass('isHidden');
                                  $('#clickForBike').css('width', '15%');
                                  $('#clickForBike').css('padding', '0.8em 0');
                                  $('#clickForBike').css('margin', '0 0 0 4em');
                                  $('.outlinContainBox').css('border-bottom', '1px solid #9DC3E6');
                                  //旗子
                                  $('#flag01').css('animation', 'flag01_part2 1s forwards');
                                  $('#flag02').css('animation', 'flag02_part2 1s forwards');
                                  $("#yourterminalPoint-keiIn").removeClass('isHidden');
                                  $("#submitButton").removeClass('isHidden');
                              });
                              //計算[目前位置去到marker]
                              var distanceMatrixService = new google.maps.DistanceMatrixService;
                              var startPoint = currentPost.position;
                              var ternimalPoint = this.position;
                              //alert(ternimalPoint);

                              if(ternimalPoint==null){
                                  $.alert("請選擇一處腳踏車站 :) ");
                              }
                              else
                              {
                                  //開始計算
                                  var distanceMatrixService = new google.maps.DistanceMatrixService;
                                  distanceMatrixService.getDistanceMatrix({
                                      origins: [startPoint],
                                      destinations: [ternimalPoint],
                                      travelMode: google.maps.TravelMode.WALKING,
                                      unitSystem: google.maps.UnitSystem.IMPERIAL,
                                      avoidHighways: false,
                                      avoidTolls: false
                                  }, function(response, status) {
                                        //console.log(response);
                                        if (status !== google.maps.DistanceMatrixStatus.OK) {
                                            $.alert("發生錯誤:( 原因為: "+status);
                                        }
                                        else {
                                            var result = response.rows[0].elements[0];
                                            //console.log(response);
                                            if(result.status==="OK"){
                                                //計算完成
                                                var distanceText = result.distance.value;  //m
                                                var durationNum =  result.duration.value; //seconds
                                                /*$.alert("距離大約"+ Math.ceil(durationNum/1000)
                                                  +"公里,\n 路程大約"+Math.ceil(durationNum/60)+"分鐘 :)");*/
                                                if(Math.ceil(durationNum/60)<10){  //超過10分鐘的路程會冒通知
                                                }
                                                else if(Math.ceil(durationNum/60)>=10 && Math.ceil(durationNum/60)<15){
                                                    $.alert("路程大約"+Math.ceil(durationNum/60)+"分鐘,\n有點小遠喔 :)");
                                                }
                                                else{
                                                    $.alert("路程大約"+Math.ceil(durationNum/60)+"分鐘,\n太遠了不建議前往 :(");
                                                }
                                                //物件更動
                                                $("#detailDirectionArea-text-clue").last().addClass('isHidden');
                                                $(".expectValueArea").removeClass('isHidden');
                                                //顯示計時與計費
                                                var tempTimee = secondsToTime(durationNum);
                                                document.getElementById("calHour").textContent = tempTimee.h;
                                                document.getElementById("calMinu").textContent = tempTimee.m;
                                                document.getElementById("gCost").textContent = "(不計費)";
                                                document.getElementById("sCost").textContent = "(不計費)";
                                                //路徑指示
                                                var directionsService = new google.maps.DirectionsService;
                                                var desinatonBikeStop = ternimalPoint; //=bike stop
                                                directionsService.route({
                                                      origin: startPoint,
                                                      destination: desinatonBikeStop,
                                                      travelMode: google.maps.TravelMode.WALKING,
                                                }, function(response, status) {
                                                        if (status === google.maps.DirectionsStatus.OK) {
                                                            var directionsDisplay = new google.maps.DirectionsRenderer({
                                                                map: map,
                                                                directions: response,
                                                                draggable: true,
                                                                polylineOptions: {
                                                                      strokeColor: '#70AD47'
                                                                }
                                                            });
                                                            //把default起終點消掉
                                                            directionsDisplay.setMap(map);
                                                            directionsDisplay.setOptions( { suppressMarkers: true } );

                                                            // if map上發生任何點擊事件 舊的route取消
                                                            $( "#mapArea" ).click(function() {
                                                                  directionsDisplay.setMap(null);
                                                            });
                                                            //開始把所有路徑指示標上去
                                                            //先創建html tag
                                                            var oneAsignmentBox ="<div class=\"oneAsignmentBox\"><div class=\"oneAsignmentBox-text\"></div><div class=\"oneAsignmentBox-TDarea\"><div class=\"oneAsignmentBox-TDarea-time\"></div><div class=\"oneAsignmentBox-TDarea-distance\"></div></div><div class=\"oneAsignmentBox-ifWarn\"><div class=\"oneAsignmentBox-ifWarn-pic\"></div><div class=\"oneAsignmentBox-ifWarn-text\"></div></div><div class=\"clear\"></div></div>";
                                                            var totleHTMLtag="";
                                                            for(var l=0; l<response.routes[0].legs[0].steps.length; l++){
                                                                totleHTMLtag=totleHTMLtag+oneAsignmentBox;
                                                            }
                                                            //創建框架
                                                            document.getElementById('detailDirectionArea-text').innerHTML = totleHTMLtag;
                                                            //把內容存進去  以下皆為陣列
                                                            var Apart = document.getElementsByClassName('oneAsignmentBox-text');
                                                            var Bpart = document.getElementsByClassName('oneAsignmentBox-TDarea-time');
                                                            var Cpart = document.getElementsByClassName('oneAsignmentBox-TDarea-distance');
                                                            var Dpart = document.getElementsByClassName('oneAsignmentBox-ifWarn-pic');
                                                            var Epart = document.getElementsByClassName('oneAsignmentBox-ifWarn-text');

                                                            for(var a=0; a<response.routes[0].legs[0].steps.length; a++){
                                                                var tempText = response.routes[0].legs[0].steps[a].instructions;
                                                                tempText=removeHTMLtag(tempText);
                                                                Apart[a].textContent = tempText;

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
                                                                //如果指示內容涉及危險區域
                                                                var destinationAddress = response.routes[0].legs[0].end_address;  //終點位置的字串
                                                                for(var aa=0; aa<accidentsList.length; aa++){
                                                                    if( destinationAddress.match(accidentsList[aa].county) ){
                                                                      //先篩鄉鎮 如果是該鄉鎮 接下來比對steps中是否涉及該路段
                                                                      if( tempText.match(accidentsList[aa].road1) || tempText.match(accidentsList[aa].road2) ){
                                                                        var addAPic="<img src=\"img/attention.png\">";
                                                                        Dpart[a].innerHTML = addAPic;
                                                                        Epart[a].textContent= "危險路段";
                                                                      }
                                                                    }
                                                                }
                                                            }
                                                            //處理路徑指示結束

                                                        }
                                                        else {$.alert("發生錯誤:( 原因為: "+status);}
                                                })


                                            }   //if(result.status==="OK")
                                            else{
                                                $.alert("發生錯誤:( 原因是: "+status);
                                            }
                                        } //成功計算
                                    });
                              }//else結束 -未選擇腳踏車站點

                        }); //click Listener結束

                        markers[k].addListener('mouseover', function() {
                            this.setIcon(highlightedIcon);
                        });
                        markers[k].addListener('mouseout', function() {
                            this.setIcon(defaultIcon);
                        });
                  } // markers[k]結束



              } //success: function(xml) END

            }); //ajax END

            //按下取得腳踏車紐
            $('#clickForBike').click(function() {
                    if ( $(this).hasClass('clicked') ) {
                            // 第二次按了
                        for (var i=0; i<markers.length; i++) {
                              markers[i].setMap(null);
                        }
                        $(this).removeClass('clicked');
                    }
                    else {
                        $(this).last().addClass('clicked');
                        for (var i=0; i<markers.length; i++) {
                              markers[i].setMap(map);
                              markers[i].setAnimation(google.maps.Animation.DROP);
                        }
                    }
            });
            //按下送出地址
            $('#submitButton').click(function() {
                if( document.getElementById('yourterminalPoint-keiIn').value != "" ){
                //有輸入值
                      var keyInAddress = document.getElementById('yourterminalPoint-keiIn').value;  //輸入的目的地
                      var startPoint = currentPost; //現在位置
                      var bikeStop = $(this).data('thisPoint'); //選擇的腳踏車站 maker物件 取得目前被點到的物件 (Marker)

                      var directionsService = new google.maps.DirectionsService;  //路徑指示的時候需要

                      //GEO解碼 - 輸入的目標是否存在
                      var geocoder = new google.maps.Geocoder();
                      geocoder.geocode({'address': keyInAddress}, function(results, status) {
                          if (status === google.maps.GeocoderStatus.OK){
                              var tLat = results[0].geometry.location.lat();
                              var tLng = results[0].geometry.location.lng();
                              var finalP = find_closest_marker(tLat,tLng,markers);  //抓出距離輸入地址 最近的站點 (是個marker物件)

                              directionsService.route({
                                  origin: startPoint.position,
                                  destination: finalP.position,
                                  travelMode: google.maps.TravelMode.WALKING,
                                  waypoints: [{location:bikeStop.position, stopover: true}],
                              }, function(response, status) {
                                    if (status === google.maps.DirectionsStatus.OK)
                                    {
                                        //畫圖
                                        var directionsDisplay = new google.maps.DirectionsRenderer({
                                              map: map,
                                              directions: response,
                                              draggable: true,
                                              polylineOptions: {
                                                  strokeColor: '#1AA260'
                                              }
                                        });
                                        //把多餘的點消掉
                                        for(var v=0; v<markers.length; v++){
                                          if( markers[v] ==finalP || markers[v]==startPoint){
                                          }
                                          else{
                                            markers[v].setMap(null);
                                          }
                                        }
                                        //把default起終點消掉
                                        directionsDisplay.setMap(map);
                                        directionsDisplay.setOptions( { suppressMarkers: true } );
                                        map.setZoom(20);

                                        var accidentsList = Load2OpenDataAndSave(); //危險路段
                                        //開始把所有路徑指示標上去
                                        //先創建html tag
                                        var oneAsignmentBox ="<div class=\"oneAsignmentBox\"><div class=\"oneAsignmentBox-text\"></div><div class=\"oneAsignmentBox-TDarea\"><div class=\"oneAsignmentBox-TDarea-time\"></div><div class=\"oneAsignmentBox-TDarea-distance\"></div></div><div class=\"oneAsignmentBox-ifWarn\"><div class=\"oneAsignmentBox-ifWarn-pic\"></div><div class=\"oneAsignmentBox-ifWarn-text\"></div></div><div class=\"clear\"></div></div>";
                                        var totleHTMLtag="";
                                        for(var a=0; a<response.routes[0].legs[1].steps.length; a++){
                                            totleHTMLtag=totleHTMLtag+oneAsignmentBox;
                                        }

                                        //創建框架
                                        document.getElementById('detailDirectionArea-text').innerHTML = totleHTMLtag;
                                        //設置價錢與時間資訊
                                        //總耗時需要legs(0)+legs(1)
                                        
                                        var totaalSec = ((response.routes[0].legs[0].duration.value + response.routes[0].legs[1].duration.value)/3).toFixed(0);    //google是步行 腳踏車時間約1/3
                                        //alert(totaalSec);
                                        var afterCal = secondsToTime(totaalSec);
                                        //alert(afterCal.h+", "+afterCal.m);
                                        document.getElementById('calHour').textContent = afterCal.h;
                                        document.getElementById('calMinu').textContent = afterCal.m;
                                        //算資費
                                        var howManyMin = (totaalSec/60).toFixed(0); //進位成整數 幾分鐘
                                        var gernalF = calBikeFeeGernal(howManyMin);
                                        var specialF = calBikeFeeSpecial(howManyMin);
                                        document.getElementById('gCost').textContent = gernalF+"元";
                                        document.getElementById('sCost').textContent = specialF+"元";


                                        //把內容存進去  以下皆為陣列
                                        var Apart = document.getElementsByClassName('oneAsignmentBox-text');
                                        var Bpart = document.getElementsByClassName('oneAsignmentBox-TDarea-time');
                                        var Cpart = document.getElementsByClassName('oneAsignmentBox-TDarea-distance');
                                        var Dpart = document.getElementsByClassName('oneAsignmentBox-ifWarn-pic');
                                        var Epart = document.getElementsByClassName('oneAsignmentBox-ifWarn-text');


                                        for(var a=0; a<response.routes[0].legs[1].steps.length; a++){
                                              var tempText = response.routes[0].legs[1].steps[a].instructions;
                                              tempText=removeHTMLtag(tempText);
                                              Apart[a].textContent = tempText;

                                              var tempTime = response.routes[0].legs[1].steps[a].duration.value;
                                              if(tempTime>=60){   //超過1分鐘
                                                      Bpart[a].textContent = (response.routes[0].legs[1].steps[a].duration.value/60).toFixed(0)+" 分";
                                              }
                                              else{
                                                      Bpart[a].textContent = (response.routes[0].legs[1].steps[a].duration.value)+" 秒";
                                              }
                                              var tempDis = response.routes[0].legs[1].steps[a].distance.value;
                                              if(tempDis>=500){ //500公尺以上
                                                      Cpart[a].textContent = (tempDis/1000).toFixed(0) + " 公里"; //四捨五入 小數後一位
                                              }
                                              else{
                                                      Cpart[a].textContent = tempDis.toFixed(0) + " 公尺";
                                              }
                                                                //如果指示內容涉及危險區域
                                              var destinationAddress = response.routes[0].legs[1].end_address;  //終點位置的字串
                                              for(var aa=0; aa<accidentsList.length; aa++){
                                              if( destinationAddress.match(accidentsList[aa].county) ){
                                                      //先篩鄉鎮 如果是該鄉鎮 接下來比對steps中是否涉及該路段
                                                      if( tempText.match(accidentsList[aa].road1) || tempText.match(accidentsList[aa].road2) ){
                                                              var addAPic="<img src=\"img/attention.png\">";
                                                                    Dpart[a].innerHTML = addAPic;
                                                                    Epart[a].textContent= "危險路段";
                                                              }
                                                       }
                                              }

                                        }
                                        //處理路徑指示結束

                                    }
                                    else {$.alert("載入錯誤 :(\n"+"<span style='font-size:0.5em;'>"+status+"</span>");
                                    }
                                })  //directionsService END



                          } //if成功geocode
                          else {
                              $.alert("載入錯誤 or 地址錯誤 :(\n"+"<span style='font-size:0.5em;'>"+status+"</span>");   //如果輸入不正確?
                          }
                      }); //geocoder END

                }
                else{
                    $.alert("尚未輸入地址 :)");
                }

            });




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

  }  //initMapPathPlanPage END

  function handleNoGeolocation(errorFlag) {
    if (errorFlag == true) {
        $.alert("地圖定位失敗 :( ");
    }
    else {
        $.alert("您的瀏覽器似乎不支援定位服務 :( ");
    }
    initialLocation = K_city_government;
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


  //XML to JSON
  function xmlToJson(xml){
        // Create the return object
        var obj = {};

        if (xml.nodeType == 1) { // element
        // do attributes
          if (xml.attributes.length > 0) {
              obj["@attributes"] = {};
              for (var j = 0; j < xml.attributes.length; j++) {
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
          for(var i = 0; i < xml.childNodes.length; i++) {
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
        //console.log(locations_wholeArea);   OK取到值

        if (infowindow.marker != marker) {
          //依據這ID去查相關資料
          var showText ="";
          for(var j=0; j<locations_wholeArea.length; j++){
              if( parseInt(locations_wholeArea[j].stopID) ==stopID){
                var availBike = locations_wholeArea[j].availBike;
                var availSPace = locations_wholeArea[j].availSPace;
                showText = "<br><h2 style='font-weight: bold; font-size: 1em;'>"+marker.title+"</h2><br>"
                +"<p>空車數: "+availBike+",  空位數: "+availSPace+"</p>";
              }
          }
          infowindow.setContent(showText);
          infowindow.marker = marker;


          infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
          });

          infowindow.open(map, marker);
        }
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
       return String;
  }


  function Load2OpenDataAndSave(){
      var accidents1 = {county: "前鎮區", road1: "中山四路", road2: "中安路"};
      var accidents2 = {county: "左營區", road1: "民族一路", road2: "大中一路"};
      var accidents3 = {county: "前鎮區", road1: "中山四路", road2: "鎮海路"};
      var accidents4 = {county: "小港區", road1: "中山四路", road2: "平和東路"};
      var accidents5 = {county: "三民區", road1: "民族一路", road2: "十全一路"};
      var accidents6 = {county: "前鎮區", road1: "中山四路", road2: "金福路"};
      var accidents7 = {county: "前鎮區", road1: "中山四路", road2: "凱旋四路"};
      var accidents8 = {county: "前鎮區", road1: "中山三路", road2: "凱旋四路"};
      var accidents9 = {county: "前鎮區", road1: "中山四路", road2: "鎮中路"};
      var accidents10 = {county: "前鎮區", road1: "中山四路", road2: "五甲三路"};
      var accidents = [];
      accidents.push(accidents1,accidents2,accidents3,accidents4,accidents5,accidents6,accidents7,accidents8,accidents9,accidents10);
      return accidents;

  }

/*
  function  dealWithFinalPointInput(currentPost,specifyMarker){
    //終點輸入的listener

    if( document.getElementById('yourterminalPoint-keiIn').value != "" ){
          //有輸入值
          var finalPoint = document.getElementById('yourterminalPoint-keiIn').value;
          var startPoint = currentPost; //現在位置
          var bikeStop = specifyMarker; //選擇的腳踏車站 maker物件

          //var directionsService = new google.maps.DirectionsService;
          //先算輸入的地址 與哪個站點最近
          //讀資料集 用經緯度算最近距離
          //var distanceMatrixService = new google.maps.DistanceMatrixService;
          //var allDresult=[];    //用來存所有運算結果

          //GEO解碼
          var geocoder = new google.maps.Geocoder();
          geocoder.geocode({'address': finalPoint}, function(results, status) {
              if (status === google.maps.GeocoderStatus.OK) {
                  var tLat = results[0].geometry.location.lat();
                  var tLng = results[0].geometry.location.lng();
                  find_closest_marker(tLat,tLng);
                  
              } else {
                  $.alert("發生錯誤:(\n"+status);
              }
          });


    }
    else{
          $.alert("尚未輸入地址 :)");
    }
    //alert(document.getElementById('yourterminalPoint-keiIn').value);

  }*/

  function cal2PointsDiruation(pointA, pointB){
    var theTime=0;
    var distanceMatrixService = new google.maps.DistanceMatrixService;
    distanceMatrixService.getDistanceMatrix({
                    origins: [pointA],
                    destinations: [pointB],
                    travelMode: google.maps.TravelMode.WALKING,
                    unitSystem: google.maps.UnitSystem.IMPERIAL,
    }, function(response, status) {
          if (status !== google.maps.DistanceMatrixStatus.OK) {
                 $.alert("發生錯誤:( 原因是"+status);
          } else {
          //成功 - 取得兩點之間的duritation
                  theTime = response.rows[0].elements[0].duration.value;
          }
    });
    return theTime;
  }

  function find_closest_marker( lat1, lon1, markers ) {
    var pi = Math.PI;
    var R = 6371; //equatorial radius
    var distances = [];
    var closest = -1;

    for( i=0; i<markers.length; i++ ) {
        var lat2 = markers[i].position.lat();
        var lon2 = markers[i].position.lng();

        var chLat = lat2-lat1;
        var chLon = lon2-lon1;

        var dLat = chLat*(pi/180);
        var dLon = chLon*(pi/180);

        var rLat1 = lat1*(pi/180);
        var rLat2 = lat2*(pi/180);

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(rLat1) * Math.cos(rLat2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c;

        distances[i] = d;
        if ( closest == -1 || d < distances[closest] ) {
            closest = i;
        }
    }

    // (debug) The closest marker is:
    return markers[closest];
  }

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


