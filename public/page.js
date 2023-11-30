/** The core Vue instance controlling the UI */
const vm = new Vue({
  el: "#vue-instance",
  data() {
    return {
      cryptWorker: null,
      socket: null,
      originPublicKey: null,
      destinationPublicKey: null,
      messages: [],
      notifications: [],
      currentRoom: null,
      pendingRoom: Math.floor(Math.random() * 1000),
      draft: "",
    };
  },
  async created() {
    this.addNotification("Generando par de llaves...");

    this.cryptWorker = new Worker("crypto-worker.js");

    this.originPublicKey = await this.getWebWorkerResponse("generate-keys");
    this.addNotification(
      `Par de llaves generadas - ${this.getKeySnippet(this.originPublicKey)}`
    );

    this.socket = io("http://192.168.1.5:3000");
    this.setupSocketListeners();
  },
  methods: {
    setupSocketListeners() {
      this.socket.on("connect", () => {
        this.addNotification("Conectado al servidor.");
        this.joinRoom();
      });

      this.socket.on("disconnect", () =>
        this.addNotification("Lost Connection")
      );

      this.socket.on("MESSAGE", async (message) => {
        if (
          message.recipient.e === this.originPublicKey.e &&
          message.recipient.n === this.originPublicKey.n
        ) {
          message.text = await this.getWebWorkerResponse(
            "decrypt",
            message.text
          );
          this.messages.push(message);
        }
      });

      this.socket.on("NEW_CONNECTION", () => {
        this.addNotification("Otro usuario ah entrado a la sala...");
        this.sendPublicKey();
      });

      this.socket.on("ROOM_JOINED", (newRoom) => {
        this.currentRoom = newRoom;
        this.addNotification(`Has entrado a la sala - ${this.currentRoom}`);
        this.sendPublicKey();
      });

      this.socket.on("PUBLIC_KEY", (key) => {
        this.addNotification(
          `Llave pública recibida - ${this.getKeySnippet(key)}`
        );
        this.destinationPublicKey = key;
      });

      this.socket.on("user disconnected", () => {
        this.notify(
          `Usuario desconectado - ${this.getKeySnippet(this.destinationKey)}`
        );
        this.destinationPublicKey = null;
      });

      this.socket.on("ROOM_FULL", () => {
        this.addNotification(
          `No se ha podido entrar a la sala ${this.pendingRoom}, la sala esta llena.`
        );

        this.pendingRoom = Math.floor(Math.random() * 1000);
        this.joinRoom();
      });

      this.socket.on("INTRUSION_ATTEMPT", () => {
        this.addNotification("Un tercer usuario ha intentado unirse a la sala");
      });
    },

    async sendMessage() {
      if (!this.draft || this.draft === "") {
        return;
      }

      let message = Immutable.Map({
        text: this.draft,
        recipient: this.destinationPublicKey,
        sender: this.originPublicKey,
      });

      this.draft = "";

      this.addMessage(message.toObject());

      if (this.destinationPublicKey) {
        const encryptedText = await this.getWebWorkerResponse("encrypt", [
          message.get("text"),
          this.destinationPublicKey,
        ]);
        const encryptedMsg = message.set("text", encryptedText);

        this.socket.emit("MESSAGE", encryptedMsg.toObject());
      }
    },

    joinRoom() {
      if (this.pendingRoom !== this.currentRoom && this.originPublicKey) {
        this.addNotification(`Conectando a la sala - ${this.pendingRoom}`);

        this.messages = [];
        this.destinationPublicKey = null;

        this.socket.emit("JOIN", this.pendingRoom);
      }
    },

    addMessage(message) {
      this.messages.push(message);
      this.autoscroll(this.$refs.chatContainer);
    },

    addNotification(message) {
      const timestamp = new Date().toLocaleTimeString();
      this.notifications.push({ message, timestamp });
      this.autoscroll(this.$refs.notificationContainer);
    },

    getWebWorkerResponse(messageType, messagePayload) {
      return new Promise((resolve, reject) => {
        const messageId = Math.floor(Math.random() * 100000);

        this.cryptWorker.postMessage(
          [messageType, messageId].concat(messagePayload)
        );

        const handler = function (e) {
          if (e.data[0] === messageId) {
            e.currentTarget.removeEventListener(e.type, handler);

            resolve(e.data[1]);
          }
        };

        this.cryptWorker.addEventListener("message", handler);
      });
    },

    sendPublicKey() {
      if (this.originPublicKey) {
        this.socket.emit("PUBLIC_KEY", this.originPublicKey);
      }
    },

    getKeySnippet(key) {
      return `{${key.e} - ${key.n}}`;
    },

    autoscroll(element) {
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    },
  },
});
