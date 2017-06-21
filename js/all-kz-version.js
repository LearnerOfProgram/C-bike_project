
//網頁定位
if (navigator.geolocation) {
    // HTML5 定位抓取
      navigator.geolocation.getCurrentPosition(function (position) {
          mapServiceProvider(position.coords.latitude, position.coords.longitude);
      },function(error) {
          switch (error.code) {
              case error.TIMEOUT:
                  alert('連線逾時');
                  break;

              case error.POSITION_UNAVAILABLE:
                  alert('無法取得定位');
                  break;

              case error.PERMISSION_DENIED: // 拒絕
                  alert('無法取得定位，\n目前位置預設為國立高雄大學。');
                  break;

              case error.UNKNOWN_ERROR:
                  alert('不明的錯誤，請稍候再試');
                  break;
          }
      });
}
else { // 不支援 HTML5 定位
  // 若支援 Google Gears
  if (window.google && google.gears) {
    try {
      // 嘗試以 Gears 取得定位
      var geo = google.gears.factory.create('beta.geolocation');
      geo.getCurrentPosition(successCallback, errorCallback, { enableHighAccuracy: true, gearsRequestAddress: true });
    } catch (e) {
      alert('定位失敗請稍候再試');
    }
  }
  else {
    alert('無法取得定位，\n目前位置預設為國立高雄大學。');
  }
}

	//建立一個叫map的地圖
function initMap() {
    // Constructor creates a new map - only center and zoom are required.
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 22.734274, lng: 120.284271},
        zoom: 14
      });
}

  //連入網站取得資訊
  var xhr =new XMLHttpRequest();
  xhr.open("POST","http://www.c-bike.com.tw/xml/stationlistopendata.aspx", true)
  xhr.send(null);

  	//宣告一個儲存腳踏車站點資訊的陣列
  var points = new Array();

  	//當連線成功時開始執行
  $.ajax({
    type: "GET",
    url: "./opendata/bikeInfo.xml",
    dataType: "xml",
    success: function(xml){
            var JSONobject = xmlToJson(xml);
            var length = JSONobject.BIKEStationData.BIKEStation.Station.length;

            for(var i = 0; i < length ; i++){

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

            function populateInfoWindow(marker, infowindow){
                 if(infowindow.marker != marker){
                      infowindow.marker = marker;
                      infowindow.setContent(
                         '<div class="map-popout">'+
                         '<div class="map-popout-title">'+
                         '<img id="No2" src="img/No.2.png"><span id="map-popout-title-word">  站點資訊</span>'+
                         '</div>'+
                         '<div class="map-popout-info">'+
                         '<div class="map-popout-stop-name">'+
                         marker.title+
                         '</div>'+
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
                         '<div class="map-popout-address">'+
                         marker.StationAddress+
                         '</div>'+
                         '<div class="map-popout-streetview">'+
                         '<img id="map-popout-pic" src="'+marker.StationPic1+'" onclick="enlarge()">'+
                         '</div>'+
                         '<a href="pathPlanning.html?StationID='+marker.title+'"><div class="start-navigation">'+
                         '開始導航→'+
                         '</div></a>'+
                         '</div>'+
                         '</div>'
                      );
                      infowindow.open(map,marker);
                      infowindow.addListner('closeclick',function(){
                              infowindow.setMarker(null);
                      });

                 };
            }

    } //success: function(xml) END

  }); //ajax END

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
function mapServiceProvider(latitude, longitude) {
  console.log(latitude);
  console.log(longitude);
	map.setCenter(new google.maps.LatLng(latitude,longitude));
	map.setZoom(16);
  var currentPost = new google.maps.Marker({
      position: new google.maps.LatLng(latitude, longitude),
      map: map,
      icon: 'img/currentPoint.png',
      title: "現在位置",
  });
  currentPost.setMap(map);
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