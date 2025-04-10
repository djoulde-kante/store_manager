require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./config/db');

async function testUserAuth() {
  try {
    // Vérifier si l'utilisateur admin existe
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (users.length === 0) {
      console.log('Utilisateur admin non trouvé dans la base de données!');
      
      // Créer l'utilisateur admin si nécessaire
      console.log('Création de l\'utilisateur admin...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      
      console.log('Utilisateur admin créé avec succès!');
    } else {
      const user = users[0];
      console.log('Utilisateur admin trouvé:', {
        id: user.id,
        username: user.username,
        role: user.role,
        password_hash_length: user.password_hash.length
      });
      
      // Tester l'authentification
      const isMatch = await bcrypt.compare('admin123', user.password_hash);
      console.log('Test d\'authentification:', isMatch ? 'Réussi' : 'Échoué');
      
      if (!isMatch) {
        console.log('Le mot de passe hashé ne correspond pas. Mise à jour du mot de passe...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        await pool.query(
          'UPDATE users SET password_hash = ? WHERE username = ?',
          [hashedPassword, 'admin']
        );
        
        console.log('Mot de passe admin mis à jour avec succès!');
      }
    }
  } catch (error) {
    console.error('Erreur lors du test d\'authentification:', error);
  } finally {
    // Fermer la connexion à la base de données
    pool.end();
  }
}

testUserAuth();
