angular
  .module('myApp')
  .controller('mainController', ['$scope', '$http', '$anchorScroll', '$location',
    function($scope, $http, $anchorScroll, $location) {
      $scope.totalespormes = {};
      $scope.dataConsultores = [];
      $scope.mesinicio;
      $scope.mesfin;
      $scope.meses = [
        { id: '01', name: 'Enero' },
        { id: '02', name: 'Febrero' },
        { id: '03', name: 'Marzo' },
        { id: '04', name: 'Abril' },
        { id: '05', name: 'Mayo' },
        { id: '06', name: 'Junio' },
        { id: '07', name: 'Julio' },
        { id: '08', name: 'Agosto' },
        { id: '09', name: 'Septiembre' },
        { id: '10', name: 'Octubre' },
        { id: '11', name: 'Noviembre' },
        { id: '12', name: 'Diciembre' }
      ];
      $scope.anos = [
        { id: '01', name: 2003 },
        { id: '02', name: 2004 },
        { id: '03', name: 2005 },
        { id: '04', name: 2006 },
        { id: '05', name: 2007 }
      ];
      $scope.consultores = [];

      $http({
        method: 'GET',
        url: '/queryConsultores'
      }).then(function successCallback(response) {
        $scope.usuarios = response.data.usuarios;
      }, function errorCallback(error) {
        console.log(error)
      });
      //agregar o quitar consultores de los checkbox para enviar el request al servidor
      $scope.cambiar = function(nombreConsultor) {
        var i = $scope.consultores.indexOf(nombreConsultor);
        if (i != -1) {
          $scope.consultores.splice(i, 1);
        } else {
          $scope.consultores.push(nombreConsultor);
        }
      }
      $scope.relatorio = function() {
        if ($scope.mesinicio && $scope.anoinicio && $scope.mesfin && $scope.anofin && $scope.consultores) {
          var fullReq = {
            mesinicio: $scope.mesinicio,
            anoinicio: $scope.anoinicio,
            mesfin: $scope.mesfin,
            anofin: $scope.anofin,
            consultores: $scope.consultores
          }
          $http.post('/relatorio', fullReq).then(function successCallback(data) {
            $scope.dataConsultores = data.data.a;
            $scope.brut_salarios = data.data.brut_salarios;
            if (Object.keys($scope.dataConsultores).length == 0) {
              console.log('no hay datos que mostrar')
            } else {
              //agrupar por las ventas por mes de cada consultor
              for (var prop in $scope.dataConsultores) {
                var nombre = prop;
                prop = $scope.dataConsultores[nombre]
                $scope.dataConsultores[nombre].groupbymes = _.groupBy(prop, function(mes) {
                  return mes.mes;
                });
              }
              //agregar el brut_salario a cada consultor
              _.forIn($scope.dataConsultores,  function(value,  prop)  {
                var nombre = prop;
                for (var i = $scope.brut_salarios.length - 1; i >= 0; i--) {
                  if ($scope.brut_salarios[i].co_usuario == $scope.dataConsultores[nombre][0].co_usuario) {
                    $scope.dataConsultores[nombre].brut_salario = $scope.brut_salarios[i].brut_salario;
                  }
                }
              });
              //agregarle los totales por mes de cada concepto por cada consultor
              _.forIn($scope.dataConsultores,  function(value,  prop)  {
                var nombre = prop;
                _.forIn($scope.dataConsultores[nombre].groupbymes,  function(value,  newprop)  {
                  //total de receita por mes
                  $scope.dataConsultores[nombre].groupbymes[newprop].receitadelmes = _.sumBy($scope.dataConsultores[nombre].groupbymes[newprop],
                    function(o) {
                      return o.receita;
                    });
                  //total de comision por mes
                  $scope.dataConsultores[nombre].groupbymes[newprop].comisiondelmes = _.sumBy($scope.dataConsultores[nombre].groupbymes[newprop],
                    function(o) {
                      return o.comision;
                    });
                  //total de lucro por mes
                  $scope.dataConsultores[nombre].groupbymes[newprop].lucrodelmes =
                    $scope.dataConsultores[nombre].groupbymes[newprop].receitadelmes -
                    ($scope.dataConsultores[nombre].brut_salario +
                      $scope.dataConsultores[nombre].groupbymes[newprop].comisiondelmes);
                });
              });
            }
          }, function errorCallback(error) {
            console.log(error);
          });
        } else {
          console.log('no va el req');
        }
      }

      $scope.grafico = function() {
        console.log($scope.dataConsultores)
          //la libreria de chartjs tiene un bug cuando se actualizan los datos dinamicamente
          //por eso se elimina los canvas anteriores y se crea uno nuevo con los nuevos datos
          //eliminar canvas anterior
        var in_canvas = document.getElementById('chart-container');
        while (in_canvas.hasChildNodes()) {
          in_canvas.removeChild(in_canvas.lastChild);
        }
        //agregar nuevo canvas
        var newDiv = document.createElement('canvas');
        in_canvas.appendChild(newDiv);
        newDiv.id = 'myChart2';
        document.getElementById('myChart2').setAttribute('width', '1000px');
        document.getElementById('myChart2').setAttribute('height', '500px');
        //--
        var recetas = {};
        var barChartData = {}
        var mesesbar = _.map($scope.meses, 'name');
        mesesbar = mesesbar.slice(Number($scope.mesinicio.id) - 1, Number($scope.mesfin.id));
        barChartData.labels = mesesbar;
        var average = _.map($scope.brut_salarios, 'brut_salario');
        average = _.sum(average);
        average = average / Object.keys($scope.dataConsultores).length;
        var canvas = document.getElementById("myChart2");
        var ctx = canvas.getContext('2d');
        var myChart = new Chart(ctx, {
          type: 'bar',
          data: barChartData,
          options: {
            scales: {
              yAxes: [{
                ticks: {
                  beginAtZero: true,
                }
              }]
            }, //linea de promedio
            annotation: {
              annotations: [{
                drawTime: "afterDatasetsDraw",
                id: "hline",
                type: "line",
                mode: "horizontal",
                scaleID: "y-axis-0",
                value: average,
                borderColor: "black",
                borderWidth: 1,
                label: {
                  backgroundColor: 'rgba(41, 44, 44, 0.3)',
                  content: "Promedio",
                  enabled: true
                },
              }]
            }
          }
        });
        //generar datos dinamicos para el grafico de barras
        _.forIn($scope.dataConsultores,  function(value,  prop)  {
          var nombre = prop;
          console.log('mesesbar', mesesbar);
          recetas[nombre] = _.mapValues($scope.dataConsultores[nombre].groupbymes, 'receitadelmes');
          console.log('rcetasnombre', recetas[nombre]);
          for (var i = 0; i <= 13; i++) {
            if (recetas[nombre][i] == undefined) {
              recetas[nombre][i] = 0;
            }
          }
          recetas[nombre] = _.values(recetas[nombre]);
          recetas[nombre] = recetas[nombre].slice(Number($scope.mesinicio.id), Number($scope.mesfin.id) + 1);
          var arreglocolores = [];
          var barcolor = randomColor({
            format: 'rgba',
            alpha: 0.5
          });
          _.forIn(recetas[nombre],  function(value,  prop)  {
            arreglocolores.push(barcolor)
          });
          //instanciar los datos
          var newdataset = {
            label: nombre,
            data: recetas[nombre],
            backgroundColor: arreglocolores,
            borderColor: arreglocolores,
            borderWidth: 1,
          }
          barChartData.datasets.push(newdataset)
          myChart.update();
        });
        $scope.recetasPieChart = recetas;
        console.log(recetas);
        $location.hash('myChart2');
        $anchorScroll();
      };




      $scope.piechart = function() {
        console.log($scope.recetasPieChart);
        var recetasPie = []
        _.forIn($scope.recetasPieChart,  function(value,  prop)  {
          recetasPie.push(_.sum(value, 'n'));
        })
        var arreglocolores = [];
        _.forIn($scope.recetasPieChart,  function(value,  prop)  {
          var piecolor = randomColor({
            format: 'rgba',
            alpha: 0.8
          });
          arreglocolores.push(piecolor)
        });
        console.log(arreglocolores);
        //la libreria de chartjs tiene un bug cuando se actualizan los datos dinamicamente
        //por eso se eliminan los canvas anteriores y se crea uno nuevo con los nuevos datos
        //eliminar canvas anterior
        var in_canvas = document.getElementById('piechart-container');
        while (in_canvas.hasChildNodes()) {
          in_canvas.removeChild(in_canvas.lastChild);
        }
        //agregar nuevo canvas
        var newDiv = document.createElement('canvas');
        in_canvas.appendChild(newDiv);
        newDiv.id = 'myChart3';
        document.getElementById('myChart3').setAttribute('width', '1000px');
        document.getElementById('myChart3').setAttribute('height', '500px');
        var nombresPieChart = [];
        _.forIn($scope.dataConsultores,  function(value,  prop)  {
          nombresPieChart.push(prop)

        })
        console.log('nombresPieChart', nombresPieChart);
        var pieChartData = {};
        var ctx = document.getElementById("myChart3");
        var myPieChart = new Chart(ctx, {
          type: 'pie',
          data: {
            datasets: [{
              data: recetasPie,
              backgroundColor: arreglocolores,
            }],
            labels: nombresPieChart
          }
        });
        $location.hash('myChart3');

        $anchorScroll();
      }

    }
  ]);
