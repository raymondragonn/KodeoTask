export const environment = {
  production: false,
  // Cambiar esta IP por la IP de tu servidor en la red local
  // Para obtener tu IP: en macOS/Linux usa 'ifconfig' o 'ip addr', en Windows usa 'ipconfig'
  // Ejemplo: 'http://192.168.1.100:8080'
  apiUrl: 'http://localhost:8080',
  // IP del servidor para notificaciones UDP/TCP
  serverHost: 'localhost',
  tcpPort: 8081,
  udpPort: 8082
};

