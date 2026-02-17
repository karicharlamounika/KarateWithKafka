function fn(params) {
  var DriverManager = Java.type('java.sql.DriverManager');
  var Class = Java.type('java.lang.Class');

  Class.forName('org.sqlite.JDBC');

  var itemId = params.id;
  var latest = params.latest;
  var name = params.name;

  var dbUrl = readDbUrl ||'jdbc:sqlite:../backend/items-read-service/item_read.db';

  

  var connection = DriverManager.getConnection(dbUrl);

  var sql = latest
    ? 'SELECT id, name, quantity FROM items ORDER BY id DESC LIMIT 1'
    : name
    ? 'SELECT id, name, quantity FROM items WHERE name = ?'
    : 'SELECT id, name, quantity FROM items WHERE id = ?';

  var preparedStatement = connection.prepareStatement(sql);
  if (!latest) {
    if(!name) {
    preparedStatement.setInt(1, itemId);
  } else {   
    preparedStatement.setString(1, name);
  } 
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
