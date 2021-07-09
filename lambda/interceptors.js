// i18n es el módulo principal, sprintf permite incluir variables con '%s'
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');

module.exports = {
// Registrará todas las solicitudes entrantes
LoggingRequestInterceptor: {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
    }
},

// Registrará todas las respuestas salientes
LoggingResponseInterceptor: {
    process(handlerInput, response) {
      console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
},

// Vincula una función de traducción 't' a requestAttributes
LocalizationRequestInterceptor: {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
      resources: require('./localisation'),
      returnObjects: true
    });
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function (...args) {
      return localizationClient.t(...args);
    }
  }
},

// Carga los atributos persistentes en los atributos de sesión
LoadAttributesRequestInterceptor: {
    async process(handlerInput) {
        if(handlerInput.requestEnvelope.session['new']){ //¿Es una nueva sesión?
            const {attributesManager} = handlerInput;
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            handlerInput.attributesManager.setSessionAttributes(persistentAttributes);
        }
    }
},

// Guarda los atributos de sesión en los atributos persistentes
SaveAttributesResponseInterceptor: {
    async process(handlerInput, response) {
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession);//¿Va a finalizar la sesión?
        if(shouldEndSession || handlerInput.requestEnvelope.request.type === 'SessionEndedRequest') { // La skill se detuvo o se agotó el tiempo         
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
}
}