function fn(params) {
  var DriverManager = Java.type('java.sql.DriverManager');
  var Class = Java.type('java.lang.Class');

  Class.forName('org.sqlite.JDBC');

  var itemId = params.id;
  var latest = params.latest;

  var dbUrl = readDbUrl ||'jdbc:sqlite:/data/items_read.db';

  var connection = DriverManager.getConnection(dbUrl);

  var sql = latest
    ? 'SELECT id, name, quantity FROM items ORDER BY id DESC LIMIT 1'
    : 'SELECT id, name, quantity FROM items WHERE name = ?';

  var preparedStatement = connection.prepareStatement(sql);
  if (!latest) {
    preparedStatement.setInt(1, itemId);
  }

  var rs = preparedStatement.executeQuery();

  var result = null;
  if (rs.next()) {
    result = {
      id: rs.getInt('id'),
      name: rs.getString('name'),
      quantity: rs.getInt('quantity')
    };
  }

  rs.close();
  preparedStatement.close();
  connection.close();

  return result;
}
