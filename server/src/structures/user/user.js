export class User {
  id;
  username;
  password_hash;

  constructor(id, username, password_hash) {
    this.id = id;
    this.username = username;
    this.password_hash = password_hash;
  }
}
