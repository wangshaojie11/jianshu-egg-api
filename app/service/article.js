const Service = require('egg').Service;
const qiniu = require('qiniu')
class ArticleService extends Service {
  // 根据用户id获取文章列表
  async getArticleList({ offset = 0, limit = 10, user_id }) {
    const options = {
      offset,
      limit,
      attributes: [ 'id', 'title', 'text', 'images', 'user_id', 'type_id', 'article_num', 'ready_num', 'like_num', 'comment_num', 'status', 'created_at', 'updated_at' ],
      order: [[ 'created_at', 'desc' ], [ 'id', 'desc' ]],
      include: {
        attributes: [ 'username', 'header_url' ],
        model: this.ctx.model.Users
      }
    };
    options.where = {
      status: [ 0, 1, 2 ]
    }
    if (user_id) {
      options.where = {
        user_id,
      };
    }
    let data = await this.ctx.model.Article.findAndCountAll(options)
    data.rows = data.rows.map(info => {
      if (info.images) {
        info.images = JSON.parse(info.images)
      } else {
        info.images = [];
      }
      return info
    })
    return data;
  }
  // 根据其他条件添加
  async getArticleListByOther(wheres, offset, limit) {
    const options = {
      offset,
      limit,
      // attributes: [ 'id', 'title', 'content', 'user_id', 'created_at', 'updated_at' ],
      order: [[ 'created_at', 'desc' ], [ 'id', 'desc' ]],
    };
    if (offset) {
      options.offset = offset
    }
    if (limit) {
      options.limit = limit
    }
    if (wheres) {
      options.where = wheres
      options.where.status = [ 0, 1, 2 ]
    } else {
      options.where = {
        status: [ 0, 1, 2 ]
      }
    }
    return this.ctx.model.Article.findAndCountAll(options);
  }
  // 根据Id
  async getArticleById(id) {
    let data = await this.ctx.model.Article.findById(id);
    if (!data) {
      return {
        code: 404,
        msg: '不存在文集类型'
      }
    }
    return {
      code: 0,
      data: data
    }
  }
  // 新增
  async create(query) {
    const { ctx } = this;
    let option = {
      title: '标题栏',
      content: ' ',
      user_id: query.user_id,
      type_id: query.type_id,
      article_num: 0,
      ready_num: 0,
      like_num: 0,
      comment_num: 0,
      status: 1,
      created_at: new Date(),
      updated_at: new Date(),
    }
    let data = await ctx.model.Article.create(option);
    if (!data) {
      return {
        code: 1,
        msg: '插入失败'
      }
    }
    return {
      code: 0,
      data: data.dataValues
    }

  }
  async del(id) {
    const article = await this.ctx.model.Article.findById(id);
    if (!article) {
      return {
        code: 404,
        msg: '不存在文集类型'
      }
    }
    let data = await article.destroy();
    return {
      code: 0,
      data: data.dataValues
    }
  }
  async update(query) {
    const article = await this.ctx.model.Article.findById(query.id);
    if (!article) {
      return {
        code: 404,
        msg: '文章已被删除'
      }
    }
    let data = await article.update(query);
    return {
      code: 0,
      data: data
    }
  }
  // 生成七牛token
  async getQiniuToken() {
    const { app } = this
    // 这里需要七牛的Access Key和Secret Key
    let mac = new qiniu.auth.digest.Mac(app.config.qiniu.ak, app.config.qiniu.sk);
    let options = {
      scope: 'jianshu',
    };
    let putPolicy = new qiniu.rs.PutPolicy(options);
    let uploadToken = putPolicy.uploadToken(mac);
    return uploadToken
  }

  // 备份表数据更新
  async createBack(query) {
    const { ctx } = this;
    let option = {
      article_id: query.article_id,
      title: query.title,
      content: query.content,
      text: query.text,
      article_num: query.article_num,
      status: 1,
      created_at: new Date(),
      updated_at: new Date(),
    }
    let data = await ctx.model.ArticleBack.create(option);
    if (!data) {
      return {
        code: 1,
        msg: '插入失败'
      }
    }
    return {
      code: 0,
      data: data.dataValues
    }

  }
  // 根据类型ID 获取文章列表
  async getArticleBackByTypeId() {
    // const { ctx } = this;
    return new Promise((resolve, reject) => {
      this.app.model.query('SELECT a.id,b.* ' +
        'FROM t_articles a LEFT JOIN (SELECT id,article_id,MAX(created_at) as created_at,title,content ' +
        'FROM t_article_backs type_id = 1) as b ON (a.id = b.article_id) ' +
        'WHERE a.type_id = 1', { type: 'SELECT' }).then(results => {
        resolve(results)
      }).catch(err => {
        reject(err)
      })
    })
  }
}

module.exports = ArticleService
