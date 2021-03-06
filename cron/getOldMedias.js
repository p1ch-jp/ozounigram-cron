var conf = require('config');
var cron = require('cron').CronJob;
var request = require('superagent');
var moment = require('moment');
var mongo = require('mongodb').MongoClient

var url = 'https://api.instagram.com/v1/tags/' + encodeURI('お雑煮') + '/media/recent';
var total = 0;

new cron('0,10,20,30,40,50 * * * * *', function() {
  request
    .get(url)
    .query({
      access_token: conf.token,
      count: 30
    })
    .end(function(err, res) {
      // mediasを整形
      var medias = [];
      for (var i = 0; i < res.body.data.length; i++) {
        var obj = {
          id: res.body.data[i].id,
          time: moment.unix(res.body.data[i].created_time).format('YYYY-MM-DD HH:mm:ss'),
          tags: res.body.data[i].tags,
          link: res.body.data[i].link,
          image: res.body.data[i].images.low_resolution.url,
          text: res.body.data[i].caption.text,
          username: res.body.data[i].user.username,
          fullname: res.body.data[i].user.full_name,
          icon: res.body.data[i].user.profile_picture
        }
        medias.push(obj);
      };

      // データベースに登録
      mongo.connect(conf.db, function(err, db) {
        var col = db.collection('medias');
        col.insertMany(medias, function(err, res) {
          if (!err) {
            total += medias.length;
            console.log('[INFO] データベースに登録完了 (' + total + '件)');
            db.close();
          };
        });
      });

      // URLを更新
      url = res.body.pagination.next_url;

      // 一番古いデータまで取れたら終了
      if (res.body.data.length < 30) {
        console.log('[INFO] 終わり');
        process.exit();
      };

      // ログを出力
      console.log(res.body.pagination.next_url);
    });
}, null, true);