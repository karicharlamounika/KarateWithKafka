function fn(params) {
  var DriverManager = Java.type('java.sql.DriverManager');
  var Class = Java.type('java.lang.Class');

  Class.forName('org.sqlite.JDBC');

  var itemId = params.id;

  var dbUrl =
    karate.config.readDbUrl ||
    'jdbc:sqlite:/data/read.db';

  var connection = DriverManager.getConnection(dbUrl);
  var preparedStatement = connection.prepareStatement(
    'SELECT id, name, quantity FROM items WHERE id = ?'
  );

  preparedStatement.setInt(1, itemId);
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
