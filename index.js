var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var favicon = require('serve-favicon');
var _ = require('lodash');

var app = express();
app.set('port', (process.env.PORT || 4000));

var connection = mysql.createConnection({
  connectionLimit: 20,
  host: 'jj820qt5lpu6krut.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
  user: 'i624it7e1ihlgfnm',
  password: 'ek27xt6lcutur5wz',
  database: 'ed0gqsrtrt0z0v5q'
});
connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + connection.threadId);
});
app.use('/public', express.static('public'))
app.use(favicon(__dirname + '/public/img/favicon.ico'));

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

var dbQuery = {
  getAllQuery: `SELECT cao_usuario.no_usuario,cao_usuario.co_usuario
              FROM cao_usuario
              JOIN permissao_sistema
              ON cao_usuario.co_usuario=permissao_sistema.co_usuario
              WHERE permissao_sistema.co_sistema = 1
              AND permissao_sistema.in_ativo = 'S'
              AND permissao_sistema.co_tipo_usuario IN (0,1,2)`,
  relatorioQuery: `SELECT
                  (cao_fatura.valor - (cao_fatura.valor*(cao_fatura.total_imp_inc/100))) AS receita,
                  ((cao_fatura.valor - (cao_fatura.valor*(cao_fatura.total_imp_inc/100))) * (cao_fatura.comissao_cn/100)) AS comision,
                  cao_os.co_os, cao_fatura.total_imp_inc,
                  cao_usuario.co_usuario, MONTH(cao_fatura.data_emissao) AS mes, cao_usuario.no_usuario,
                  YEAR(cao_fatura.data_emissao) AS ano
                  FROM cao_usuario, cao_os, cao_fatura, cao_salario
                  WHERE cao_usuario.co_usuario IN (?)
                  AND cao_os.co_usuario=cao_usuario.co_usuario
                  AND cao_os.co_os=cao_fatura.co_os
                  AND cao_fatura.data_emissao >=  '?-\'?\'-01 00:00:00'
                  AND cao_fatura.data_emissao <=  '?-\'?\'-31 00:00:00'
                  GROUP BY MONTH(cao_fatura.data_emissao), YEAR(cao_fatura.data_emissao), cao_usuario.co_usuario,
                  cao_usuario.no_usuario, cao_os.co_os, cao_fatura.valor,cao_fatura.total_imp_inc,cao_fatura.comissao_cn,
                  cao_fatura.data_emissao
                  ORDER BY cao_fatura.data_emissao`,
  brutSalarioQuery: `SELECT cao_salario.brut_salario,cao_salario.co_usuario
                      FROM cao_salario
                      WHERE cao_salario.co_usuario IN (?)`
}

app.get('/', function(req, res) {
  res.render('index.html');
})
app.get('/queryConsultores', function(req, res) {
  connection.query(dbQuery.getAllQuery, function(error, rows, fields) {
    if (error) {
      console.log(error);
    } else {
      var usuarios = rows;
      console.log(rows);
      res.send({ usuarios: rows });
    }
  });
});

app.post('/relatorio', function(req, res) {
  var a = [];
  var consultores = req.body.consultores;
   connection.query(dbQuery.relatorioQuery, [
        consultores,
        req.body.anoinicio,
        req.body.mesinicio,
        req.body.anofin,
        req.body.mesfin
      ], function(error, rows, fields) {
    if (error) {
      console.log(error);
    } else {
          a = _.groupBy(rows, function(n) {
            return n.no_usuario;
          });
        }
      })
      connection.query(dbQuery.brutSalarioQuery, [consultores], function(error, rows, fields) {
        if (error) {
          console.log(error);
        } else {
          brut_salarios = rows;
          res.send({ a, brut_salarios });
        }
      });
    });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
