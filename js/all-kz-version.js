
//This JS is used to support search-page.html

var startPoint; //用儲存起點
var endPoint;  //用來儲存終點
var currentPost;  //當前位置
var browserSupportFlag =  new Boolean();
//測試用的地點
//高雄駁二：22.620431, 120.281636
var ifDemo = false;

//導航按鈕是否被按
jQuery('#navi_btn').click(function(){
  $(this).data('clicked', true);
});

//建立一個叫map的地圖
function initMap() {
  // Constructor creates a new map - only center and zoom are required.
 
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 22.734274, lng: 120.284271},
    zoom: 15
  });
  //在載入地圖的時候取得當前位置
  if(window.navigator.geolocation!=undefined) {
      browserSupportFlag = true;
      navigator.geolocation.getCurrentPosition(function(position) {
        //取得現在位置
        var nowThePoint;
        if(ifDemo==false){
          nowThePoint = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        }
        else{
          nowThePoint = new google.maps.LatLng(22.620424, 120.312047); //高雄市四維行政中心;
        }

        map.setCenter(nowThePoint);

        var makeSureLat = judgeBetween(nowThePoint.lat(), 23.28, 22.28);
        var makeSureLng = judgeBetween(nowThePoint.lng(), 121.0115, 120.1032);

        if(makeSureLat==true&&makeSureLng==true){

            //styling the icon size
            var icon = {
                url: "img/currentPoint.png", // url
                scaledSize: new google.maps.Size(80, 80), // scaled size
            };

            //標示出當前位置
            currentPost = new google.maps.Marker({
                position: nowThePoint,
                map: map,
                icon: icon,
                animation: google.maps.Animation.DROP,
            });
            currentPost.addListener('click', toggleBounce);
            currentPost.setMap(map);

            //連入網站取得資訊
            var xhr =new XMLHttpRequest();
            xhr.addEventListener("load", reqListener);
            xhr.open("POST","http://www.c-bike.com.tw/xml/stationlistopendata.aspx", true)
            //xhr.send();

            //宣告一個儲存腳踏車站點資訊的陣列
            var points = new Array();

            //當連線成功時開始執行
            //主程式所在
            $.ajax({
              type: "GET",
              url: "./opendata/bikeInfo.xml",
              dataType: "xml",
              success: function(xml){
                      var JSONobject = xmlToJson(xml);
                      var length = JSONobject.BIKEStationData.BIKEStation.Station.length;

                      for(var i=0; i<length; i++){
                        //將取到的值用變數存下
                        var StationName = JSONobject.BIKEStationData.BIKEStation.Station[i].StationName;
                        var lat = Number(JSONobject.BIKEStationData.BIKEStation.Station[i].StationLat);
                        var lng = Number(JSONobject.BIKEStationData.BIKEStation.Station[i].StationLon);
                        var StationID = JSONobject.BIKEStationData.BIKEStation.Station[i].StationID;
                        var StationNums1 = Number(JSONobject.BIKEStationData.BIKEStation.Station[i].StationNums1);
                        var StationNums2 = Number(JSONobject.BIKEStationData.BIKEStation.Station[i].StationNums2);
                        var StationAddress = JSONobject.BIKEStationData.BIKEStation.Station[i].StationAddress;
                        var StationPic1 = JSONobject.BIKEStationData.BIKEStation.Station[i].StationPic3;
                        var StationPic2 = JSONobject.BIKEStationData.BIKEStation.Station[i].StationPic2;
                        //儲存進陣列
                        points[i] = {
                          'StationName': StationName,
                          'lat': lat,
                          'lng': lng,
                          'StationID': StationID,
                          'StationNums1': StationNums1,
                          'StationNums2': StationNums2,
                          'StationAddress': StationAddress,
                          'StationPic1': StationPic1,
                          'StationPic2': StationPic2,
                        };
                      }


                      //宣告地標陣列
                      var markers = [];

                      //宣告訊息視窗
                      var largeInfoWindow = new google.maps.InfoWindow();

                      //印出地標
                      for (var i = 0; i< length; i++) {

                        var marker = new google.maps.Marker({
                           map: map,
                           position: {lat: points[i].lat, lng: points[i].lng},
                           title: points[i].StationName,
                           id: points[i].StationID,
                           StationNums1: points[i].StationNums1,
                           StationNums2: points[i].StationNums2,
                           StationAddress: points[i].StationAddress,
                           StationPic1: points[i].StationPic1,
                           StationPic2: points[i].StationPic2,
                           icon: 'img/maps-and-flags.png'
                        });

                        //把地標存進陣列裡
                        markers.push(marker);

                        marker.addListener('click', function(){
                            populateInfoWindow(this,largeInfoWindow);
                        });
                      }


              } //success: function(xml) END

            }); //ajax END




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
                initMap();
            });

        }

    }, function() {
      //ifSupport(browserSupportFlag);
    });
  }
  // Browser doesn't support Geolocation
  else {
    //browserSupportFlag = false;
    ifSupport(browserSupportFlag);
  }






}






function reqListener () {
    console.log(this.responseText);
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


// 取得 Gears 定位發生錯誤
function errorCallback(err) {
  var msg = 'Error retrieving your location: ' + err.message;
  alert(msg);
}

// 成功取得 Gears 定位
function successCallback(p) {
    mapServiceProvider(p.latitude, p.longitude);
}

// 顯示經緯度
function mapServiceProvider(latitudeValue, longitudeValue) {
  console.log(latitudeValue);
  console.log(longitudeValue);

	/*map.setCenter(new google.maps.LatLng(latitudeValue, longitudeValue));
	map.setZoom(16);
  var currentPost = new google.maps.Marker({
      position: new google.maps.LatLng(latitude, longitude),
      map: map,
      icon: 'img/currentPoint.png',
      title: "現在位置",
  });
  currentPost.setMap(map);*/
}


function enlarge(element){
	var pic = document.getElementById("map-popout-pic").src;
	console.log(pic);
	document.getElementById('big-pic').src=pic;
	document.getElementById('picture-preview').style.display = "block";
}

function hiddenbigpic(element){
	document.getElementById('picture-preview').style.display = "none";
}

function toggleBounce() {
  if (currentPost.getAnimation() !== null) {
      currentPost.setAnimation(null);
  }
  else {
      currentPost.setAnimation(google.maps.Animation.BOUNCE);
  }
}


function judgeBetween(target, upper, lower){
  var result;
  if(target<=upper&&target>=lower){result =true;}
  else {result = false;}

  return result;
}


function populateInfoWindow(marker, infowindow){
   if(infowindow.marker != marker){
        infowindow.marker = marker;
        //取得該marker的經緯度
        var thisLat = marker.getPosition().lat();
        var thisLng = marker.getPosition().lng();
        var thisTitle = marker.title;
        var ansArr = [thisTitle,thisLat,thisLng];
        var dUrl = "location.href='pathPlanning.html?stopID="+marker.id+"'";
        console.log(dUrl);

        infowindow.setContent(
           '<div class="map-popout" id="pop-type1">'+
              '<div class="map-popout-title">'+
              '<img id="No2" src="img/No.2.png"><span id="map-popout-title-word">站點資訊</span>'+
              '</div>'+
              '<div class="map-popout-info">'+
                 '<div class="map-popout-stop-name">'+marker.title+'</div>'+
                 '<div class="map-popout-stop-left-car">'+
                    '<img id="map-popout-icon" src="img/bicycle.png">'+
                    '<p id="map-popout-number">'+marker.StationNums1+'</p>'+
                    '<div class="clear"></div>'+
                 '</div>'+
                 '<div class="map-popout-stop-left-space">'+
                    '<img id="map-popout-icon" src="img/back-arrow.png">'+
                    '<p id="map-popout-number">'+marker.StationNums2+'</p>'+
                    '<div class="clear"></div>'+
                 '</div>'+
                 '<div class="clear"></div>'+
                 '<div class="map-popout-address">'+marker.StationAddress+'</div>'+
                 '<div class="map-popout-streetview">'+
                    '<img id="map-popout-pic" src="'+marker.StationPic1+'" onclick="enlarge()">'+
                    '<span id="clueText">點擊照片可放大</span>'+
                 '</div>'+
                 '<div class="start-navigation">'
                    +'<a href="#" id="navi_btn" onclick="'+dUrl+'">開始導航</div>'+
                 '</div>'+
              '</div>'+
           '</div>'
        );

        infowindow.open(map,marker);
        infowindow.addListener('closeclick',function(){
          infowindow.setMarker(null);
        });

   };
}