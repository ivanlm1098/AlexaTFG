const Alexa = require('ask-sdk-core');
const persistence = require('./persistence');
const interceptors = require('./interceptors');

let numArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
shuffle(numArray);
let randomNum, status, message, audio;
let level = 1;

//Explicación: Este manejador se ejecuta cuando se abre la aplicación. Se da un mensaje bienvenida al usuario y se le presentan los ejercicios existentes.
//Precondición: El usuario debe tener la aplicación instalada
//Entradas: El usuario dice "Alexa, abre ejercicios mentales"
//Salidas: La aplicación devuelve un audio de bienvenida y muestra una pantalla con el menú
//Postcondición: El usuario debe seleccionar un ejercicio
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        sessionAttributes.state = 0;
        
        sessionAttributes.moneyActive = false;
        sessionAttributes.wordsActive = false;
        sessionAttributes.lettersActive = false;
        sessionAttributes.objectsActive = false;
        sessionAttributes.colorsActive = false;
        
        const speakOutput = requestAttributes.t('WELCOME_MSG');
        const speechImage = "Tengo estos juegos para ti: Dinero, Palabras, Letras, Objetos y Colores.";
        const speechImage1 = "<br><br>Di el ejercicio que quieras realizar.";
        
        if(supportsAPL(handlerInput)){
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(requestAttributes.t('FALLBACK_MSG'))
                .addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_menu.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage + speechImage1,
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/menu_prueba.png"
                        }
                    }
                }) 
                .getResponse();
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(requestAttributes.t('FALLBACK_MSG'))
            .withSimpleCard('¡Bienvenido!', speechImage)
            .getResponse();
    }
};

//Explicación: Se presenta al usuario el ejercicio del dinero, se indica el nivel en el que se encuentra y se realiza la primera pregunta.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "dinero".
//Salidas: Se abre el ejercicio del dinero.
//Postcondición: El usuario debe responder a las preguntas utilizando la estructura correspondiente.
const WelcomeMoneyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WelcomeMoneyIntent';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        sessionAttributes.state = 1;
        
        sessionAttributes.counterMo = 0;
        
        sessionAttributes.correctMo = 0;
        sessionAttributes.wrongMo = 0;
        
        sessionAttributes.moneyActive = true;
        sessionAttributes.wordsActive = false;
        sessionAttributes.lettersActive = false;
        sessionAttributes.objectsActive = false;
        sessionAttributes.colorsActive = false;
        
        if (sessionAttributes.moneyCounterLevel == 1 || sessionAttributes.moneyCounterLevel == 2 || sessionAttributes.moneyCounterLevel == 3){
	    	level = sessionAttributes.moneyCounterLevel;
        }
        else{
            sessionAttributes.moneyCounterLevel = 1;
        }
        
        const money = getNextMoney(handlerInput);
        console.log("money: ", money);
        
        const speakOutput = 'Bienvenido al ejercicio del dinero. Consiste en que te voy a mostrar imágenes de monedas y billetes, y tienes que responder a las preguntas. En este ejercicio estás en el nivel ' + sessionAttributes.moneyCounterLevel + '. Pregunta número 1. ';
        const speakOutput2 = money.question;
        
        sessionAttributes.speakOutput = speakOutput2;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_MONEY_MSG') + speakOutput2;
        
        const speechImage = "Pregunta " + (sessionAttributes.counterMo + 1) + ". " + speakOutput2;
        const speechImage1 = '¡Bienvenido al ejercicio del dinero!';
        const speechImage2 = money.question;
        const speechImage3 = "Para responder debes decir un numero. Por ejemplo: cero";
        
        if(supportsAPL(handlerInput)){
            return handlerInput.responseBuilder
                .speak(speakOutput + speakOutput2)
                .reprompt(requestAttributes.t('FALLBACK_MONEY_MSG') + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
                .addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage,
                            'message1': speechImage3,
                            'image': money.image
                        }
                    }
                })
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak(speakOutput + speakOutput2)
            .reprompt(requestAttributes.t('FALLBACK_MONEY_MSG') + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
            .withStandardCard(speechImage1, speechImage2, money.image, money.image)
            .getResponse();
    }
};

//Explicación: El usuario debe responder a las preguntas siguiendo la estructura correspondiente hasta completar un total de 5 preguntas.
//Precondición: El usuario debe haber abierto el ejercicio del dinero diciendo "dinero".
//Entradas: El usuario responde diciendo un número.
//Salidas: Se indica al usuario si acierta o falla, y se realiza la siguiente pregunta o se indica que el ejercicio ha finalizado.
//Postcondición: El usuario puede realizar otro ejercicio o salir.
const AnswerMoneyIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		if(sessionAttributes.state === 1){
		    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerMoneyIntent';
		}
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const intent = handlerInput.requestEnvelope.request.intent;
        console.log("intent: ",intent);
        
        let checkAnswer = false;
        let answerSlot;
        if (handlerInput.requestEnvelope.request.intent.name === 'AnswerMoneyIntent'){
            checkAnswer = true;
            answerSlot = intent.slots.moneyNumber.value;
            console.log("slot: ",answerSlot);
        }
        const result = checkAnswerMo(handlerInput, answerSlot, checkAnswer);
        
        if(sessionAttributes.counterMo > 4){ //si respondo 5 finaliza 
            const speak = checkLevelMoney(sessionAttributes);
    	    const speakOutput = (result.audio + result.message + 'Hemos terminado con esta actividad. Has acertado ' + sessionAttributes.correctMo + ' y has fallado ' + sessionAttributes.wrongMo + '. ' + speak);
    	    const speakOutput1 = 'Puedes realizar otro ejercicio o salir.';
    	    const speechImage = 'Tu puntuación es: ' + sessionAttributes.correctMo + '/5. ';
    	    sessionAttributes.moneyActive = false;
    	    
    	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speakOutput + speakOutput1)
            	.reprompt(speakOutput1)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_menu.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage + requestAttributes.t('END_MSG'),
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/menu_prueba.png"
                        }
                    }
                })    
                .getResponse();
	        }
    	    
    	    return handlerInput.responseBuilder
    			.speak(speakOutput)
    			.reprompt(speakOutput1)
    			.withSimpleCard("¡FINAL!", "Tu puntuación es: " + sessionAttributes.correctMo + '/5')
    			.getResponse();
        }
        
        const money = getNextMoney(handlerInput);
    	
    	const speechOutput = (result.audio + result.message + " Pregunta número " + (sessionAttributes.counterMo + 1) + ". " + money.question);
        
        sessionAttributes.speakOutput = "Pregunta número " + (sessionAttributes.counterMo + 1) + ". " + money.question;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_MONEY_MSG') + "Pregunta número " + (sessionAttributes.counterMo + 1) + ". " + money.question;
    
    	sessionAttributes.lastResult = result.audio;
    	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
		
	    const speechImage = "Pregunta " + (sessionAttributes.counterMo + 1) + ". " + money.question; 
	    const speechImage1 = "Para responder debes decir un numero. Por ejemplo: cero";
	    
	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speechOutput)
            	.reprompt(requestAttributes.t('FALLBACK_MONEY_MSG') + "Pregunta número " + (sessionAttributes.counterMo + 1) + ". " + money.question)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage,
                            'message1': speechImage1,
                            'image': money.image
                        }
                    }
                })    
                .getResponse();
	    }

        //si acierta
        if (result.status == true){
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(requestAttributes.t('FALLBACK_MONEY_MSG') + "Pregunta número " + (sessionAttributes.counterMo + 1) + ": " + money.question)
                .withStandardCard("Correcto", speechImage, money.image, money.image)
                .getResponse();
        }
        
        //si falla
        else {
            return handlerInput.responseBuilder
    		    .speak(speechOutput)
    		    .reprompt(requestAttributes.t('FALLBACK_MONEY_MSG') + "Pregunta número " + (sessionAttributes.counterMo + 1) + ": " + money.question)
    		    .withStandardCard("Incorrecto", speechImage, money.image, money.image)
    		    .getResponse();
        }
    }
};

//Explicación: Se presenta al usuario el ejercicio de las palabras, se indica el nivel en el que se encuentra y se realiza la primera pregunta.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "palabras".
//Salidas: Se abre el ejercicio de las palabras.
//Postcondición: El usuario debe responder a las preguntas utilizando la estructura correspondiente.
const WelcomeWordsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WelcomeWordsIntent';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes.state = 2;
        
        sessionAttributes.counterWo = 0;
        
        sessionAttributes.correctWo = 0;
        sessionAttributes.wrongWo = 0;
        
        sessionAttributes.moneyActive = false;
        sessionAttributes.wordsActive = true;
        sessionAttributes.lettersActive = false;
        sessionAttributes.objectsActive = false;
        sessionAttributes.colorsActive = false;
        
        if (sessionAttributes.wordsCounterLevel == 1 || sessionAttributes.wordsCounterLevel == 2 || sessionAttributes.wordsCounterLevel == 3){
	    	level = sessionAttributes.wordsCounterLevel;
        }
        else{
            sessionAttributes.wordsCounterLevel = 1;
        }
        
        const words = getNextWords(handlerInput);
        console.log("words: ", words);
        
        const speakOutput = 'Bienvenido al ejercicio de las palabras incompletas. Consiste en que te voy a mostrar palabras incompletas y me tienes que decir cuál es la palabra completa. En este ejercicio estás en el nivel ' + sessionAttributes.wordsCounterLevel + '. Pregunta número 1. ';
        const speakOutput2 = "¿Qué palabra es?";
        
        sessionAttributes.speakOutput = speakOutput;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_WORDS_MSG') + speakOutput2;
        
        //const speechImage1 = '¡Bienvenido al ejercicio de las palabras incompletas!';
        const speechImage1 = 'Para responder debes decir: la palabra es... <br>';
        const speechImage2 = "Pregunta " + (sessionAttributes.counterWo + 1) + ". " + words.question; 
        
        if(supportsAPL(handlerInput)){
            return handlerInput.responseBuilder
                .speak(speakOutput + speakOutput2)
                .reprompt(requestAttributes.t('FALLBACK_WORDS_MSG') + "Primera pregunta: " + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
                .addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_words.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage1 + speechImage2,
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/inicioejercicio_prueba.png"
                        }
                    }
                })
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak(speakOutput + speakOutput2)
            .reprompt(requestAttributes.t('FALLBACK_WORDS_MSG') + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
            .withSimpleCard(speechImage1, speechImage2)
            .getResponse();
    }
};

//Explicación: El usuario debe responder a las preguntas siguiendo la estructura correspondiente hasta completar un total de 5 preguntas.
//Precondición: El usuario debe haber abierto el ejercicio de las palabras diciendo "palabras".
//Entradas: El usuario responde siguiendo la estructura "la palabra es...".
//Salidas: Se indica al usuario si acierta o falla, y se realiza la siguiente pregunta o se indica que el ejercicio ha finalizado.
//Postcondición: El usuario puede realizar otro ejercicio o salir.
const AnswerWordsIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		if(sessionAttributes.state === 2){
		    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerWordsIntent';
		}
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const intent = handlerInput.requestEnvelope.request.intent;
        console.log("intent: ",intent);
        
        let checkAnswer = false;
        let answerSlot;
        if (handlerInput.requestEnvelope.request.intent.name === 'AnswerWordsIntent'){
            checkAnswer = true;
            answerSlot = intent.slots.wordsWord.value;
            console.log("slot: ", answerSlot);
        }
        const result = checkAnswerWo(handlerInput, answerSlot, checkAnswer);
        
        if(sessionAttributes.counterWo > 4){ //si respondo 5 finaliza 
            const speak = checkLevelWords(sessionAttributes);
    	    const speakOutput = (result.audio + result.message + 'Hemos terminado con esta actividad. Has acertado ' + sessionAttributes.correctWo + ' y has fallado ' + sessionAttributes.wrongWo + '. ' + speak);
    	    const speakOutput1 = ' Puedes realizar otro ejercicio o salir.';
    	    const speechImage = 'Tu puntuación es: ' + sessionAttributes.correctWo + '/5. ';
    	    sessionAttributes.wordsActive = false;
    	    
    	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speakOutput + speakOutput1)
            	.reprompt(speakOutput1)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_menu.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage + requestAttributes.t('END_MSG'),
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/menu_prueba.png"
                        }
                    }
                })    
                .getResponse();
	        }
    	    
    	    return handlerInput.responseBuilder
    			.speak(speakOutput)
    			.reprompt(speakOutput1)
    			.withSimpleCard("¡FINAL!", "Tu puntuación es: " + sessionAttributes.correctWo + '/5')
    			.getResponse();
        }
        
        const words = getNextWords(handlerInput);
    	
    	const speechOutput = (result.audio + result.message + " Pregunta número " + (sessionAttributes.counterWo + 1) + ". " + "¿Qué palabra es?");
        
        sessionAttributes.speakOutput = "Pregunta número " + (sessionAttributes.counterWo + 1) + ". " + "¿Qué palabra es?";
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_WORDS_MSG') + "Pregunta número " + (sessionAttributes.counterWo + 1) + ". " + "¿Qué palabra es?";
    
    	sessionAttributes.lastResult = result.audio;
    	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
		
	    const speechImage = "Pregunta " + (sessionAttributes.counterWo + 1) + ". " + words.question; 
	    const speechImage1 = 'Para responder debes decir: la palabra es... <br>';
	    
	    if(supportsAPL(handlerInput)){
            if(result.status == true){
                return handlerInput.responseBuilder
            		.speak(speechOutput)
            		.reprompt(requestAttributes.t('FALLBACK_WORDS_MSG') + "Pregunta número " + (sessionAttributes.counterWo + 1) + ": ¿Qué palabra es?")
            		.addDirective({
                        type: 'Alexa.Presentation.APL.RenderDocument',
                        version: '1.0',
                        document: require('./documents/document_words.json'),
                        datasources: {
                            'imageData': {
                                'message': speechImage1 + speechImage,
                                'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/correcto_prueba.png"
                            }
                        }
                    })    
                    .getResponse();
            }
            
            else {
                return handlerInput.responseBuilder
        	    .speak(speechOutput)
        	    .reprompt(requestAttributes.t('FALLBACK_WORDS_MSG') + "Pregunta número " + (sessionAttributes.counterWo + 1) + ": ¿Qué palabra es?")
        	    .addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_words.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage1 + speechImage,
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/incorrecto_prueba.png"
                        }
                    }
                })    
        	    .getResponse();
            }
	    }

        //si acierta
        if (result.status == true){
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(requestAttributes.t('FALLBACK_WORDS_MSG') + "Pregunta número " + (sessionAttributes.counterWo + 1) + ". ¿Qué palabra es?")
                .withSimpleCard("Correcto", speechImage)
                .getResponse();
        }
        
        //si falla
        else {
            return handlerInput.responseBuilder
    		    .speak(speechOutput)
    		    .reprompt(requestAttributes.t('FALLBACK_WORDS_MSG') + "Pregunta número " + (sessionAttributes.counterWo + 1) + ". ¿Qué palabra es?")
    		    .withSimpleCard("Incorrecto. " + result.message, speechImage)
    		    .getResponse();
        }
    }
};

//Explicación: Se presenta al usuario el ejercicio de las letras, se indica el nivel en el que se encuentra y se realiza la primera pregunta.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "letras".
//Salidas: Se abre el ejercicio de las letras.
//Postcondición: El usuario debe responder a las preguntas utilizando la estructura correspondiente.
const WelcomeLettersIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WelcomeLettersIntent';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        sessionAttributes.state = 3;
        
        sessionAttributes.counterLe = 0;
        
        sessionAttributes.correctLe = 0;
        sessionAttributes.wrongLe = 0;
        
        sessionAttributes.moneyActive = false;
        sessionAttributes.wordsActive = false;
        sessionAttributes.lettersActive = true;
        sessionAttributes.objectsActive = false;
        sessionAttributes.colorsActive = false;
        
        if (sessionAttributes.lettersCounterLevel == 1 || sessionAttributes.lettersCounterLevel == 2 || sessionAttributes.lettersCounterLevel == 3){
	    	level = sessionAttributes.lettersCounterLevel;
        }
        else{
            sessionAttributes.lettersCounterLevel = 1;
        }
        
        const letters = getNextLetters(handlerInput);
        console.log("letters: ", letters);
        
        const speakOutput = 'Bienvenido al ejercicio de las letras. Consiste en que te voy a mostrar letras de colores y tienes que responder cuántas hay de cada color. En este ejercicio estás en el nivel ' + sessionAttributes.lettersCounterLevel + '. Pregunta número 1. ';
        const speakOutput2 = letters.question;
        
        sessionAttributes.speakOutput = speakOutput2;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_LETTERS_MSG') + speakOutput2;
        
        const speechImage1 = '¡Bienvenido al ejercicio de las letras!';
        const speechImage2 = "Pregunta " + (sessionAttributes.counterLe + 1) + ". " + letters.question;
        const speechImage3 = letters.image;
        const speechImage4 = 'Para responder debes decir: hay... Por ejemplo: hay cuatro.';
        
        if(supportsAPL(handlerInput)){
            return handlerInput.responseBuilder
                .speak(speakOutput + speakOutput2)
                .reprompt(requestAttributes.t('FALLBACK_LETTERS_MSG') + "Primera pregunta: " + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
                .addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage2,
                            'message1': speechImage4,
                            'image': speechImage3
                        }
                    }
                })
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak(speakOutput + speakOutput2)
            .reprompt(requestAttributes.t('FALLBACK_LETTERS_MSG') + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
            .withStandardCard(speechImage1, speechImage2, speechImage3, speechImage3)
            .getResponse();
    }
};

//Explicación: El usuario debe responder a las preguntas siguiendo la estructura correspondiente hasta completar un total de 5 preguntas.
//Precondición: El usuario debe haber abierto el ejercicio de las letras diciendo "letras".
//Entradas: El usuario responde siguiendo la estructura "hay...".
//Salidas: Se indica al usuario si acierta o falla, y se realiza la siguiente pregunta o se indica que el ejercicio ha finalizado.
//Postcondición: El usuario puede realizar otro ejercicio o salir.
const AnswerLettersIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		if(sessionAttributes.state === 3){
		    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerLettersIntent';
		}
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const intent = handlerInput.requestEnvelope.request.intent;
        console.log("intent: ", intent);
        
        let checkAnswer = false;
        let answerSlot;
        if (handlerInput.requestEnvelope.request.intent.name === 'AnswerLettersIntent'){
            checkAnswer = true;
            answerSlot = intent.slots.lettersNumber.value;
            console.log("slot: ", answerSlot);
        }
        const result = checkAnswerLe(handlerInput, answerSlot, checkAnswer);
        
        if(sessionAttributes.counterLe > 4){ //si respondo 5 finaliza 
            const speak = checkLevelLetters(sessionAttributes);
    	    const speakOutput = (result.audio + result.message + 'Hemos terminado con esta actividad. Has acertado ' + sessionAttributes.correctLe + ' y has fallado ' + sessionAttributes.wrongLe + '. ' + speak);
    	    const speakOutput1 = ' Puedes realizar otro ejercicio o salir.';
    	    const speechImage = 'Tu puntuación es: ' + sessionAttributes.correctLe + '/5. ';
    	    sessionAttributes.lettersActive = false;
    	    
    	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speakOutput + speakOutput1)
            	.reprompt(speakOutput1)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_menu.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage + requestAttributes.t('END_MSG'),
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/menu_prueba.png"
                        }
                    }
                })    
                .getResponse();
	        }
    	    
    	    return handlerInput.responseBuilder
    			.speak(speakOutput)
    			.reprompt(speakOutput1)
    			.withSimpleCard("¡FINAL!", "Tu puntuación es: " + sessionAttributes.correctLe + '/5')
    			.getResponse();
        }
        
        const letters = getNextLetters(handlerInput);
    	
    	const speechOutput = (result.audio + result.message + " Pregunta número " + (sessionAttributes.counterLe + 1) + ". " + letters.question);
        
        sessionAttributes.speakOutput = "Pregunta número " + (sessionAttributes.counterLe + 1) + ". " + letters.question;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_LETTERS_MSG') + "Pregunta número " + (sessionAttributes.counterLe + 1) + ". " + letters.question;
    
    	sessionAttributes.lastResult = result.audio;
    	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
		
	    const speechImage = "Pregunta " + (sessionAttributes.counterLe + 1) + ". " + letters.question; 
	    const speechImage2 = letters.image;
	    const speechImage3 = 'Para responder debes decir: hay... Por ejemplo: hay cuatro.';
	    
	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speechOutput)
            	.reprompt(requestAttributes.t('FALLBACK_LETTERS_MSG') + "Pregunta número " + (sessionAttributes.counterLe + 1) + ": " + letters.question)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage,
                            'message1': speechImage3,
                            'image': speechImage2
                        }
                    }
                })    
                .getResponse();
	    }

        //si acierta
        if (result.status == true){
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(requestAttributes.t('FALLBACK_LETTERS_MSG') + "Pregunta número " + (sessionAttributes.counterLe + 1) + ". " + letters.question)
                .withStandardCard("Correcto", speechImage, speechImage2, speechImage2)
                .getResponse();
        }
        
        //si falla
        else {
            return handlerInput.responseBuilder
    		    .speak(speechOutput)
    		    .reprompt(requestAttributes.t('FALLBACK_LETTERS_MSG') + "Pregunta número " + (sessionAttributes.counterLe + 1) + ". " + letters.question)
    		    .withStandardCard("Incorrecto. " + result.message, speechImage, speechImage2, speechImage2)
    		    .getResponse();
        }
    }
};

//Explicación: Se presenta al usuario el ejercicio de los obhetos y se realiza la primera pregunta.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "objetos".
//Salidas: Se abre el ejercicio de los objetos.
//Postcondición: El usuario debe responder a las preguntas utilizando la estructura correspondiente.
const WelcomeObjectsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WelcomeObjectsIntent';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        sessionAttributes.state = 4;
        
        sessionAttributes.counterOb = 0;
        
        sessionAttributes.correctOb = 0;
        sessionAttributes.wrongOb = 0;
        
        sessionAttributes.moneyActive = false;
        sessionAttributes.wordsActive = false;
        sessionAttributes.lettersActive = false;
        sessionAttributes.objectsActive = true;
        sessionAttributes.colorsActive = false;
        
        level = 1;
        
        /*if (sessionAttributes.objectsCounterLevel == 1 || sessionAttributes.objectsCounterLevel == 2 || sessionAttributes.objectsCounterLevel == 3){
	    	level = sessionAttributes.objectsCounterLevel;
        }
        else{
            sessionAttributes.objectsCounterLevel = 1;
        }*/
        
        const objects = getNextObjects(handlerInput);
        console.log("objects ", objects);
        
        //const speak = 'En este ejercicio estás en el nivel ' + sessionAttributes.objectsCounterLevel;
        const speakOutput = 'Bienvenido al ejercicio de los objetos. Consiste en que te voy a mostrar imágenes de objetos y me tienes que decir qué objeto es. Pregunta número 1. ';
        const speakOutput2 = objects.question;
        
        sessionAttributes.speakOutput = speakOutput2;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_OBJECTS_MSG') + speakOutput2;
        
        const speechImage = "Pregunta " + (sessionAttributes.counterOb + 1) + ". " + speakOutput2;
        const speechImage1 = '¡Bienvenido al ejercicio de los objetos!';
        //const speechImage2 = objects.question;
        const speechImage3 = 'Para responder debes decir: la respuesta es...';
        
        if(supportsAPL(handlerInput)){
            return handlerInput.responseBuilder
                .speak(speakOutput + speakOutput2)
                .reprompt(requestAttributes.t('FALLBACK_OBJECTS_MSG') + "Primera pregunta: " + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
                .addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage,
                            'message1': speechImage3,
                            'image': objects.image
                        }
                    }
                })
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak(speakOutput + speakOutput2)
            .reprompt(requestAttributes.t('FALLBACK_OBJECTS_MSG') + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
            .withStandardCard(speechImage1, speakOutput2, objects.image, objects.image)
            .getResponse();
    }
};

//Explicación: El usuario debe responder a las preguntas siguiendo la estructura correspondiente hasta completar un total de 5 preguntas.
//Precondición: El usuario debe haber abierto el ejercicio de los objetos diciendo "objetos".
//Entradas: El usuario responde siguiendo la estructura "la respuesta es...".
//Salidas: Se indica al usuario si acierta o falla, y se realiza la siguiente pregunta o se indica que el ejercicio ha finalizado.
//Postcondición: El usuario puede realizar otro ejercicio o salir.
const AnswerObjectsIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		if(sessionAttributes.state === 4){
		    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerObjectsIntent';
		}
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const intent = handlerInput.requestEnvelope.request.intent;
        console.log("intent: ", intent);
        
        let checkAnswer = false;
        let answerSlot;
        if (handlerInput.requestEnvelope.request.intent.name === 'AnswerObjectsIntent'){
            checkAnswer = true;
            answerSlot = intent.slots.objectsObject.value;
            console.log("slot: ", answerSlot);
        }
        const result = checkAnswerOb(handlerInput, answerSlot, checkAnswer);
        
        if(sessionAttributes.counterOb > 4){ //si respondo 5 finaliza 
            //const speak = checkLevelObjects(sessionAttributes);
    	    const speakOutput = (result.audio + result.message + 'Hemos terminado con esta actividad. Has acertado ' + sessionAttributes.correctOb + ' y has fallado ' + sessionAttributes.wrongOb + '. ');
    	    const speakOutput1 = 'Puedes realizar otro ejercicio o salir.';
    	    const speechImage = 'Tu puntuación es: ' + sessionAttributes.correctOb + '/5. ';
    	    sessionAttributes.objectsActive = false;
    	    
    	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speakOutput + speakOutput1)
            	.reprompt(speakOutput1)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_menu.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage + requestAttributes.t('END_MSG'),
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/menu_prueba.png"
                        }
                    }
                })    
                .getResponse();
	        }
    	    
    	    return handlerInput.responseBuilder
    			.speak(speakOutput)
    			.reprompt(speakOutput1)
    			.withSimpleCard("¡FINAL!", "Tu puntuación es: " + sessionAttributes.correctCount + '/5')
    			.getResponse();
        }
        
        const objects = getNextObjects(handlerInput);
    	
    	const speechOutput = (result.audio + result.message + " Pregunta número " + (sessionAttributes.counterOb + 1) + ". " + objects.question);
        
        sessionAttributes.speakOutput = "Pregunta número " + (sessionAttributes.counterOb + 1) + ". " + objects.question;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_OBJECTS_MSG') + "Pregunta número " + (sessionAttributes.counterOb + 1) + ". " + objects.question;
    
    	sessionAttributes.lastResult = result.audio;
    	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
		
	    const speechImage = "Pregunta " + (sessionAttributes.counterOb + 1) + ". " + objects.question; 
	    const speechImage2 = 'Para responder debes decir: la respuesta es...';
	    
	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speechOutput)
            	.reprompt(requestAttributes.t('FALLBACK_OBJECTS_MSG') + "Pregunta número " + (sessionAttributes.counterOb + 1) + ": " + objects.question)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage,
                            'message1': speechImage2,
                            'image': objects.image
                        }
                    }
                })    
                .getResponse();
	    }

        //si acierta
        if (result.status == true){
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(requestAttributes.t('FALLBACK_OBJECTS_MSG') + "Pregunta número " + (sessionAttributes.counterOb + 1) + ". " + objects.question)
                .withStandardCard("Correcto", speechImage, objects.image, objects.image)
                .getResponse();
        }
        
        //si falla
        else {
            return handlerInput.responseBuilder
    		    .speak(speechOutput)
    		    .reprompt(requestAttributes.t('FALLBACK_OBJECTS_MSG') + "Pregunta número " + (sessionAttributes.counterOb + 1) + ". " + objects.question)
    		    .withStandardCard("Incorrecto", speechImage, objects.image, objects.image)
    		    .getResponse();
        }
    }
};

//Explicación: Se presenta al usuario el ejercicio de los colores y se realiza la primera pregunta.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "colores".
//Salidas: Se abre el ejercicio de los colores.
//Postcondición: El usuario debe responder a las preguntas utilizando la estructura correspondiente.
const WelcomeColorsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WelcomeColorsIntent';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        sessionAttributes.state = 5;
        
        sessionAttributes.counterCo = 0;
        
        sessionAttributes.correctCo = 0;
        sessionAttributes.wrongCo = 0;
        
        sessionAttributes.moneyActive = false;
        sessionAttributes.wordsActive = false;
        sessionAttributes.lettersActive = false;
        sessionAttributes.objectsActive = false;
        sessionAttributes.colorsActive = true;
        
        level = 1;
        
        /*if (sessionAttributes.colorsCounterLevel == 1 || sessionAttributes.colorsCounterLevel == 2 || sessionAttributes.colorsCounterLevel == 3){
	    	level = sessionAttributes.colorsCounterLevel;
        }
        else{
            sessionAttributes.colorsCounterLevel = 1;
        }*/
        
        const colors = getNextColors(handlerInput);
        console.log("colors: ", colors);
        
        //const speak = 'En este ejercicio estás en el nivel ' + sessionAttributes.colorsCounterLevel;
        const speakOutput = 'Bienvenido al ejercicio de los colores. Consiste en que te voy a mostrar imágenes de objetos en blancoy negro y me tienes que decir su color típico. Pregunta número 1. ';
        const speakOutput2 = colors.question;
        
        sessionAttributes.speakOutput = speakOutput2;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_COLORS_MSG') + speakOutput2;
        
        const speechImage = "Pregunta " + (sessionAttributes.counterCo + 1) + ". " + speakOutput2;
        const speechImage1 = '¡Bienvenido al ejercicio de los colores!';
        //const speechImage2 = colors.question;
        const speechImage3 = 'Para responder debes decir: es de color...';
        
        if(supportsAPL(handlerInput)){
            return handlerInput.responseBuilder
                .speak(speakOutput + speakOutput2)
                .reprompt(requestAttributes.t('FALLBACK_COLORS_MSG') + "Primera pregunta: " + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
                .addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage,
                            'message1': speechImage3,
                            'image': colors.image
                        }
                    }
                })
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak(speakOutput + speakOutput2)
            .reprompt(requestAttributes.t('FALLBACK_COLORS_MSG') + speakOutput2) //para dejar la sesión abierta y que el usuario me conteste.
            .withStandardCard(speechImage1, speakOutput2, colors.image, colors.image)
            .getResponse();
    }
};

//Explicación: El usuario debe responder a las preguntas siguiendo la estructura correspondiente hasta completar un total de 5 preguntas.
//Precondición: El usuario debe haber abierto el ejercicio de los colores diciendo "colores".
//Entradas: El usuario responde siguiendo la estructura "es de color...".
//Salidas: Se indica al usuario si acierta o falla, y se realiza la siguiente pregunta o se indica que el ejercicio ha finalizado.
//Postcondición: El usuario puede realizar otro ejercicio o salir.
const AnswerColorsIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		if(sessionAttributes.state === 5){
		    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerColorsIntent';
		}
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const intent = handlerInput.requestEnvelope.request.intent;
        console.log("intent: ", intent);
        
        let checkAnswer = false;
        let answerSlot;
        if (handlerInput.requestEnvelope.request.intent.name === 'AnswerColorsIntent'){
            checkAnswer = true;
            answerSlot = intent.slots.colorsColor.value;
            console.log("slot: ", answerSlot);
        }
        
        const result = checkAnswerCo(handlerInput, answerSlot, checkAnswer);
        
        if(sessionAttributes.counterCo > 4){ //si respondo 5 finaliza 
            //const speak = checkLevelColors(sessionAttributes);
    	    const speakOutput = (result.audio + result.message + 'Hemos terminado con esta actividad. Has acertado ' + sessionAttributes.correctCo + ' y has fallado ' + sessionAttributes.wrongCo + '. ');
    	    const speakOutput1 = 'Puedes realizar otro ejercicio o salir.';
    	    const speechImage = 'Tu puntuación es: ' + sessionAttributes.correctCo + '/5. ';
    	    sessionAttributes.colorsActive = false;
    	    
    	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speakOutput + speakOutput1)
            	.reprompt(speakOutput1)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_menu.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage + requestAttributes.t('END_MSG'),
                            'image': "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Avatar/menu_prueba.png"
                        }
                    }
                })    
                .getResponse();
	        }
    	    
    	    return handlerInput.responseBuilder
    			.speak(speakOutput)
    			.reprompt(speakOutput1)
    			.withSimpleCard("¡FINAL!", "Tu puntuación es: " + sessionAttributes.correctCo + '/5')
    			.getResponse();
        }
        
        const colors = getNextColors(handlerInput);
    	
    	const speechOutput = (result.audio + result.message + " Pregunta número " + (sessionAttributes.counterCo + 1) + ". " + colors.question);
        
        sessionAttributes.speakOutput = "Pregunta número " + (sessionAttributes.counterCo + 1) + ". " + colors.question;
        sessionAttributes.repromptText = requestAttributes.t('FALLBACK_COLORS_MSG') + "Pregunta número " + (sessionAttributes.counterCo + 1) + ". " + colors.question;
    
    	sessionAttributes.lastResult = result.audio;
    	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
		
	    const speechImage = "Pregunta " + (sessionAttributes.counterCo + 1) + ". " + colors.question; 
	    const speechImage2 = 'Para responder debes decir: es de color...';
	    
	    if(supportsAPL(handlerInput)){
	        return handlerInput.responseBuilder
            	.speak(speechOutput)
            	.reprompt(requestAttributes.t('FALLBACK_COLORS_MSG') + "Pregunta número " + (sessionAttributes.counterCo + 1) + ": " + colors.question)
            	.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: require('./documents/document_others.json'),
                    datasources: {
                        'imageData': {
                            'message': speechImage,
                            'message1': speechImage2,
                            'image': colors.image
                        }
                    }
                })    
                .getResponse();
	    }

        //si acierta
        if (result.status == true){
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(requestAttributes.t('FALLBACK_COLORS_MSG') + "Pregunta número " + (sessionAttributes.counterCo + 1) + ". " + colors.question)
                .withStandardCard("Correcto", speechImage, colors.image, colors.image)
                .getResponse();
        }
        
        //si falla
        else {
            return handlerInput.responseBuilder
    		    .speak(speechOutput)
    		    .reprompt(requestAttributes.t('FALLBACK_COLORS_MSG') + "Pregunta número " + (sessionAttributes.counterCo + 1) + ". " + colors.question)
    		    .withStandardCard("Incorrecto", speechImage, colors.image, colors.image)
    		    .getResponse();
        }
    }
};

/*-------------------------------------------------------------------------------------*/
//AMAZON INTENTS    

//Explicación: Permite al usuario obtener un mensaje de orientación.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "ayuda".
//Salidas: La aplicación, en función de si el usuario se encuentra en un ejercicio o en el menú, emite un mensaje de ayuda.
//Postcondición: -
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        let speakOutput = requestAttributes.t('HELP_MSG');
        
        if (sessionAttributes.moneyActive == true){
            speakOutput = requestAttributes.t('HELP_MONEY_MSG');
        }
        
        if (sessionAttributes.wordsActive == true){
            speakOutput = requestAttributes.t('HELP_WORDS_MSG');
        }
        
        if (sessionAttributes.lettersActive == true){
            speakOutput = requestAttributes.t('HELP_LETTERS_MSG');
        }
        
        if (sessionAttributes.objectsActive == true){
            speakOutput = requestAttributes.t('HELP_OBJECTS_MSG');
        }
        
        if (sessionAttributes.colorsActive == true){
            speakOutput = requestAttributes.t('HELP_COLORS_MSG');
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

//Explicación: Permite al usuario cerrar la aplicación.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "cancela" o "para".
//Salidas: La aplicación emite un audio de despedida.
//Postcondición: Se ejecuta el SessionEndedRequestHandler
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const speakOutput = requestAttributes.t('GOODBYE_MSG');
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();
    }
};

//Explicación: El usuario recibe un mensaje orientativo cuando dice algo que la aplicación no contempla.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice algo que no se corresponde con ningún Intent definido.
//Salidas: La aplicación, en función de si el usuario se encuentra en un ejercicio o en el menú, emite un mensaje recordando cómo debe responder.
//Postcondición: -
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        let speakOutput = requestAttributes.t('FALLBACK_MSG');
        
        if (sessionAttributes.moneyActive == true){
            speakOutput = requestAttributes.t('FALLBACK_MONEY_MSG');
        }
        
        if (sessionAttributes.wordsActive == true){
            speakOutput = requestAttributes.t('FALLBACK_WORDS_MSG');
        }
        
        if (sessionAttributes.lettersActive == true){
            speakOutput = requestAttributes.t('FALLBACK_LETTERS_MSG');
        }
        
        if (sessionAttributes.objectsActive == true){
            speakOutput = requestAttributes.t('FALLBACK_OBJECTS_MSG');
        }
        
        if (sessionAttributes.colorsActive == true){
            speakOutput = requestAttributes.t('FALLBACK_COLORS_MSG');
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

//Explicación: Permite finalizar la sesión y cerrar la aplicación.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: El usuario dice "para" o "cancela", se produce un error o el usuario no responde.
//Salidas: La aplicación finaliza la sesión.
//Postcondición: La aplicación se cierra.
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Aquí iría la lógica de limpieza.
        return handlerInput.responseBuilder.getResponse(); // Se envía una respuesta vacía
    }
};

//Explicación: Manejo de errores genéricos para capturar cualquier error de sintaxis o enrutamiento.
//Precondición: El usuario debe haber abierto la aplicación.
//Entradas: Se produce un error durante la ejecución de la aplicación.
//Salidas: Se emite un mensaje indicando que se ha producido un problema y se cierra la aplicación.
//Postcondición: La aplicación se cierra.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const speakOutput = requestAttributes.t('ERROR_MSG');
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();
    }
};

/*-------------------------------------------------------------------------------------*/
/*FUNCTIONS*/

//Explicación: Permite barajar un array, es decir, intercambiar las posiciones de sus elementos.
//Parámetros: Un array.
//Devoluciones: Devuelve el mismo array de entrada con sus elementos cambiados de posiciones.
function shuffle(arr) { 
    var ctr = arr.length, temp, index;
    while (ctr > 0) {
        index = Math.floor(Math.random() * ctr);
        ctr--;
        temp = arr[ctr];
        arr[ctr] = arr[index];
        arr[index] = temp;
    }
    return arr;
}

//Explicación: Permite identificar si el dispositivo en el que se ejecuta la aplicación soporta APL.
//Parámetros: La información de la petición.
//Devoluciones: Devuelve true si lo soporta o false si no lo soporta.
function supportsAPL(handlerInput){
    const {supportedInterfaces} = handlerInput.requestEnvelope.context.System.device;
    return supportedInterfaces['Alexa.Presentation.APL'];
}

//Explicación: Actualiza el nivel del usuario en el ejercicio del dinero.
//Parámetros: Los atributos de sesión.
//Devoluciones: Una cadena de texto que indica si el usuario sube, baja o mantiene el nivel.
function checkLevelMoney(sessionAttributes){
    let speak;
    if (sessionAttributes.correctMo < 3){
        sessionAttributes.moneyCounterLevel = sessionAttributes.moneyCounterLevel - 1;
        speak = 'Has bajado al nivel ' + sessionAttributes.moneyCounterLevel + '. ';
        if (sessionAttributes.moneyCounterLevel < 1){
            sessionAttributes.moneyCounterLevel = 1;
            speak = 'Te mantienes en el nivel uno. ';
        }
        return speak;
    }
    if (sessionAttributes.correctMo == 5){
        sessionAttributes.moneyCounterLevel = sessionAttributes.moneyCounterLevel + 1;
        speak = 'Has subido al nivel ' + sessionAttributes.moneyCounterLevel + '. ';
        if (sessionAttributes.moneyCounterLevel > 3){
            sessionAttributes.moneyCounterLevel = 3;
            speak = 'Te mantienes en el nivel tres. ';
        }
        return speak;
    }
    else{
        speak = 'Te mantienes en el nivel ' + sessionAttributes.moneyCounterLevel + '. ';
        return speak;
    }
}

//Explicación: Actualiza el nivel del usuario en el ejercicio de las palabras.
//Parámetros: Los atributos de sesión.
//Devoluciones: Una cadena de texto que indica si el usuario sube, baja o mantiene el nivel.
function checkLevelWords(sessionAttributes){
    let speak;
    if (sessionAttributes.correctWo < 3){
        sessionAttributes.wordsCounterLevel = sessionAttributes.wordsCounterLevel - 1;
        speak = 'Has bajado al nivel ' + sessionAttributes.wordsCounterLevel + '. ';
        if (sessionAttributes.wordsCounterLevel < 1){
            sessionAttributes.wordsCounterLevel = 1;
            speak = 'Te mantienes en el nivel uno. ';
        }
        return speak;
    }
    if (sessionAttributes.correctWo == 5){
        sessionAttributes.wordsCounterLevel = sessionAttributes.wordsCounterLevel + 1;
        speak = 'Has subido al nivel ' + sessionAttributes.wordsCounterLevel + '. ';
        if (sessionAttributes.wordsCounterLevel > 3){
            sessionAttributes.wordsCounterLevel = 3;
            speak = 'Te mantienes en el nivel tres. ';
        }
        return speak;
    }
    else{
        speak = 'Te mantienes en el nivel ' + sessionAttributes.wordsCounterLevel + '. ';
        return speak;
    }
}

//Explicación: Actualiza el nivel del usuario en el ejercicio de las letras.
//Parámetros: Los atributos de sesión.
//Devoluciones: Una cadena de texto que indica si el usuario sube, baja o mantiene el nivel.
function checkLevelLetters(sessionAttributes){
    let speak;
    if (sessionAttributes.correctLe < 3){
        sessionAttributes.lettersCounterLevel = sessionAttributes.lettersCounterLevel - 1;
        speak = 'Has bajado al nivel ' + sessionAttributes.lettersCounterLevel + '. ';
        if (sessionAttributes.lettersCounterLevel < 1){
            sessionAttributes.lettersCounterLevel = 1;
            speak = 'Te mantienes en el nivel uno. ';
        }
        return speak;
    }
    if (sessionAttributes.correctLe == 5){
        sessionAttributes.lettersCounterLevel = sessionAttributes.lettersCounterLevel + 1;
        speak = 'Has subido al nivel ' + sessionAttributes.lettersCounterLevel + '. ';
        if (sessionAttributes.lettersCounterLevel > 3){
            sessionAttributes.lettersCounterLevel = 3;
            speak = 'Te mantienes en el nivel tres. ';
        }
        return speak;
    }
    else{
        speak = 'Te mantienes en el nivel ' + sessionAttributes.lettersCounterLevel + '. ';
        return speak;
    }
}

/*function checkLevelObjetcs(sessionAttributes){
    
}*/

/*function checkLevelColors(sessionAttributes){
    
}*/

/*-------------------------------------------------------------------------------------*/
/*GETNEXT*/

//Explicación: Permite obtener la siguiente pregunta en el ejercicio del dinero.
//Parámetros: La información de la petición.
//Devoluciones: Un array con la pregunta, la respuesta y la URL de la imagen.
function getNextMoney(handlerInput){
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var moneyDeck = [];
    
    const moneyList = {
        "uno":[
            {"question": "¿Cuántas monedas hay?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/1.jpg"},
            {"question": "¿Cuántas monedas de un euro hay?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/1.jpg"},
            {"question": "¿Cuántas monedas de cincuenta céntimos hay?", "answer": "0", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/1.jpg"},
            {"question": "¿Cuántos billetes de cinco euros hay?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/2.jpg"},
            {"question": "¿Cuántos billetes hay?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/2.jpg"},
            {"question": "¿Cuántas monedas de cincuenta céntimos hay?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/4.jpg"},
            {"question": "¿Cuántas monedas de dos euros hay?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/4.jpg"},
            {"question": "¿Cuántos billetes de cincuenta euros hay?", "answer": "0", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/5.jpg"},
            {"question": "¿Cuántos billetes de veinte euros hay?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/5.jpg"},
            {"question": "¿Cuántas monedas de veinte céntimos hay?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/7.jpg"},
            {"question": "¿Cuántas monedas hay?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/7.jpg"},
            {"question": "¿Cuántos billetes hay?", "answer": "0", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/7.jpg"},
            {"question": "¿Cuántos billetes de cincuenta euros hay?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/8.jpg"},
            {"question": "¿Cuántas monedas hay?", "answer": "0", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/8.jpg"}
        ],
        "dos": [
            {"question": "¿Cuántos euros faltan para tener nueve euros?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/1.jpg"},
            {"question": "¿Cuántas monedas faltan para que haya 5 monedas?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/1.jpg"},
            {"question": "¿Cuántos billetes faltan para tener 10 billetes?", "answer": "6", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/2.jpg"},
            {"question": "¿Cuántas monedas hay?", "answer": "2", "image": "htyttps://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/3.jpg"},
            {"question": "¿Cuántos billetes de diez euros hay?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/3.jpg"},
            {"question": "¿Cuántos euros suman las monedas?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/3.jpg"},
            {"question": "¿Cuántos euros suman los billetes?", "answer": "15", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/3.jpg"},
            {"question": "¿Cuántos euros suman las monedas?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/4.jpg"},
            {"question": "¿Cuántas monedas hay?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/6.jpg"},
            {"question": "¿Cuántos billetes hay?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/6.jpg"},
            {"question": "¿Cuántos billetes de cinco euros hay?", "answer": "0", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/6.jpg"},
            {"question": "¿Cuántas monedas quedan si quitamos dos monedas?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/6.jpg"},
            {"question": "¿Cuántas monedas faltan para tener 6 monedas?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/7.jpg"},
            {"question": "¿Cuántos billetes faltan para tener 7 billetes?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/8.jpg"},
            {"question": "¿Cuántas monedas hay?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/9.jpg"}
        ],
        "tres":[
            {"question": "¿Cuántos euros faltan para tener 50 euros?", "answer": "20", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/2.jpg"},
            {"question": "¿Cuántos euros hay en total?", "answer": "18", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/3.jpg"},
            {"question": "¿Cuántas monedas faltan para que haya 7 monedas?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/4.jpg"},
            {"question": "¿Cuántas monedas quedan si quitamos una moneda?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/4.jpg"},
            {"question": "¿Cuántos billetes faltan para tener 8 billetes?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/5.jpg"},
            {"question": "¿Cuántos euros faltan para tener 100 euros?", "answer": "45", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/5.jpg"},
            {"question": "¿Cuántos billetes quedan si quitamos 3 billetes?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/5.jpg"},
            {"question": "¿Cuántos euros suman los billetes?", "answer": "30", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/6.jpg"},
            {"question": "¿Cuántas monedas habría si cogemos 2 monedas más?", "answer": "7", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/7.jpg"},
            {"question": "¿Cuántos euros hay?", "answer": "85", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/8.jpg"},
            {"question": "¿Cuántos euros faltan para tener 150 euros?", "answer": "65", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/8.jpg"},
            {"question": "¿Cuántos billetes faltan para tener 5 billetes?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/9.jpg"},
            {"question": "¿Cuántos euros suman los billetes?", "answer": "70", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/9.jpg"},
            {"question": "¿Cuántas monedas faltan para tener 9 monedas?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/9.jpg"},
            {"question": "¿Cuántos billetes quedan si quitamos 2 billetes?", "answer": "0", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Dinero/9.jpg"}
        ]
    };
    
    if(!sessionAttributes.counterMo){
        if(level == 1){
            moneyDeck = shuffle(moneyList.uno); 
        }
        if(level == 2){
            moneyDeck = shuffle(moneyList.dos);
        }
        if(level == 3){
            moneyDeck = shuffle(moneyList.tres);
        }
        console.log("moneyDeck: ", moneyDeck);
    	sessionAttributes.moneyDeck = moneyDeck;
    }
    else {
        moneyDeck = sessionAttributes.moneyDeck;
	    console.log("moneyDeck: ", moneyDeck);
    }
    const money = moneyDeck[sessionAttributes.counterMo];
    
    sessionAttributes.lastMoney = money;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.log("money: ", money);
    return money;
}

//Explicación: Permite obtener la siguiente pregunta en el ejercicio de las palabras.
//Parámetros: La información de la petición.
//Devoluciones: Un array con la pregunta, la respuesta y la URL de la imagen.
function getNextWords(handlerInput){
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var wordsDeck = [];
    
    const wordsList = {
        "uno":[
            {"question": "¿Qué palabra es? \r\n N_CHE", "answer": "noche"},
            {"question": "¿Qué palabra es? \r\n TESOR_", "answer": "tesoro"},
            {"question": "¿Qué palabra es? \r\n P_BRE", "answer": "pobre"},
            {"question": "¿Qué palabra es? \r\n M_DICO", "answer": "medico"},
            {"question": "¿Qué palabra es? \r\n DOMING_", "answer": "domingo"},
            {"question": "¿Qué palabra es? \r\n PAÑUE_O", "answer": "pañuelo"},
            {"question": "¿Qué palabra es? \r\n GALLI_A", "answer": "gallina"},
            {"question": "¿Qué palabra es? \r\n BAI_E", "answer": "baile"},
            {"question": "¿Qué palabra es? \r\n M_DRE", "answer": "madre"},
            {"question": "¿Qué palabra es? \r\n _OLEGIO", "answer": "colegio"}
        ],
        "dos": [
            {"question": "¿Qué palabra es? \r\n G_RAJ_", "answer":"garaje"},
            {"question": "¿Qué palabra es? \r\n M_N_STRO", "answer":"ministro"},
            {"question": "¿Qué palabra es? \r\n B_LANZ_", "answer":"balanza"},
            {"question": "¿Qué palabra es? \r\n S_LIT_RIO", "answer":"solitario"},
            {"question": "¿Qué palabra es? \r\n V_S_", "answer":"vaso"},
            {"question": "¿Qué palabra es? \r\n S_LDAD_", "answer":"soldado"},
            {"question": "¿Qué palabra es? \r\n DI_ERT_DO", "answer":"divertido"},
            {"question": "¿Qué palabra es? \r\n G_T_", "answer":"gato"},
            {"question": "¿Qué palabra es? \r\n C_BL_", "answer":"cable"},
            {"question": "¿Qué palabra es? \r\n IG_E_IA", "answer":"iglesia"}
        ],
        "tres":[
            {"question": "¿Qué palabra es? \r\n T_RT_G_", "answer":"tortuga"},
            {"question": "¿Qué palabra es? \r\n C_N_J_", "answer":"conejo"},
            {"question": "¿Qué palabra es? \r\n PR_BL_M_", "answer":"problema"},
            {"question": "¿Qué palabra es? \r\n M_NZ_N_", "answer":"manzana"},
            {"question": "¿Qué palabra es? \r\n PL_T_N_", "answer":"platano"},
            {"question": "¿Qué palabra es? \r\n V_NT_N_", "answer":"ventana"},
            {"question": "¿Qué palabra es? \r\n T_L_F_N_", "answer":"telefono"},
            {"question": "¿Qué palabra es? \r\n _RM_R_O", "answer":"armario"},
            {"question": "¿Qué palabra es? \r\n C_RR_T_R_", "answer":"carretera"},
            {"question": "¿Qué palabra es? \r\n M_CH_L_", "answer":"mochila"}
        ]
    };
    
    if(!sessionAttributes.counterWo){
        if(level == 1){
            wordsDeck = shuffle(wordsList.uno); 
        }
        if(level == 2){
            wordsDeck = shuffle(wordsList.dos);
        }
        if(level == 3){
            wordsDeck = shuffle(wordsList.tres);
        }
        console.log("wordsDeck: ", wordsDeck);
    	sessionAttributes.wordsDeck = wordsDeck;
    }
    else {
        wordsDeck = sessionAttributes.wordsDeck;
	    console.log("wordsDeck: ", wordsDeck);
    }
    const words = wordsDeck[sessionAttributes.counterWo];
    
    sessionAttributes.lastWord = words;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.log("words: ", words);
    return words;
}

//Explicación: Permite obtener la siguiente pregunta en el ejercicio de las letras.
//Parámetros: La información de la petición.
//Devoluciones: Un array con la pregunta, la respuesta y la URL de la imagen.
function getNextLetters(handlerInput){
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var lettersDeck = [];
    
    const lettersList = {
        "uno":[
            {"question": "¿Cuántas letras hay de color rojo?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/1.png"},//imagen 1: 
            {"question": "¿Cuántas letras hay de color azul?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/1.png"},
            {"question": "¿Cuántas letras hay de color verde?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/1.png"},
            {"question": "¿Cuántas letras hay de color amarillo?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/1.png"},
            {"question": "¿Cuántas letras hay de color negro?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/1.png"},
            {"question": "¿Cuántas letras hay de color rojo?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/2.png"},//imagen 2:
            {"question": "¿Cuántas letras hay de color azul?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/2.png"},
            {"question": "¿Cuántas letras hay de color verde?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/2.png"},
            {"question": "¿Cuántas letras hay de color amarillo?", "answer": "1", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/2.png"},
            {"question": "¿Cuántas letras hay de color negro?", "answer": "2", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/2.png"}
        ],
        "dos": [
            {"question": "¿Cuántas letras hay de color rojo?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/3.png"},//imagen 3: 
            {"question": "¿Cuántas letras hay de color azul?", "answer": "6", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/3.png"},
            {"question": "¿Cuántas letras hay de color verde?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/3.png"},
            {"question": "¿Cuántas letras hay de color amarillo?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/3.png"},
            {"question": "¿Cuántas letras hay de color negro?", "answer": "4", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/3.png"},
            {"question": "¿Cuántas letras hay de color rojo?", "answer": "6", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/4.png"},//imagen 4:
            {"question": "¿Cuántas letras hay de color azul?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/4.png"},
            {"question": "¿Cuántas letras hay de color verde?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/4.png"},
            {"question": "¿Cuántas letras hay de color amarillo?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/4.png"},
            {"question": "¿Cuántas letras hay de color negro?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/4.png"}
        ],
        "tres":[
            {"question": "¿Cuántas letras hay de color rojo?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/5.png"},//imagen 5: 
            {"question": "¿Cuántas letras hay de color azul?", "answer": "5", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/5.png"},
            {"question": "¿Cuántas letras hay de color verde?", "answer": "7", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/5.png"},
            {"question": "¿Cuántas letras hay de color amarillo?", "answer": "9", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/5.png"},
            {"question": "¿Cuántas letras hay de color negro?", "answer": "6", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/5.png"},
            {"question": "¿Cuántas letras hay de color rojo?", "answer": "6", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/6.png"},//imagen 6:
            {"question": "¿Cuántas letras hay de color azul?", "answer": "3", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/6.png"},
            {"question": "¿Cuántas letras hay de color verde?", "answer": "9", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/6.png"},
            {"question": "¿Cuántas letras hay de color amarillo?", "answer": "7", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/6.png"},
            {"question": "¿Cuántas letras hay de color negro?", "answer": "7", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Matrices/6.png"}
        ]
    };
    
    if(!sessionAttributes.counterLe){
        if(level == 1){
            lettersDeck = shuffle(lettersList.uno); 
        }
        if(level == 2){
            lettersDeck = shuffle(lettersList.dos);
        }
        if(level == 3){
            lettersDeck = shuffle(lettersList.tres);
        }
        console.log("lettersDeck: ", lettersDeck);
    	sessionAttributes.lettersDeck = lettersDeck;
    }
    else {
        lettersDeck = sessionAttributes.lettersDeck;
	    console.log("lettersDeck: ", lettersDeck);
    }
    const letters = lettersDeck[sessionAttributes.counterLe];
    
    sessionAttributes.lastLetters = letters;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.log("letters: ", letters);
    return letters;
}

//Explicación: Permite obtener la siguiente pregunta en el ejercicio de los objetos.
//Parámetros: La información de la petición.
//Devoluciones: Un array con la pregunta, la respuesta y la URL de la imagen.
function getNextObjects(handlerInput){
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var objectsDeck = [];
    
    const question = "¿Qué objeto es?";
    
    const objectsList = {
        "uno":[
            {"question": question, "answer": "telefono", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/telefono.jpg"},
            {"question": question, "answer": "boligrafo", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/boligrafo.jpg"},
            {"question": question, "answer": "silla", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/silla.jpg"},
            {"question": question, "answer": "calcetines", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/calcetines.jpg"},
            {"question": question, "answer": "lapiz", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/lapiz.jpg"},
            {"question": question, "answer": "cuchara", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/cuchara.jpg"},
            {"question": question, "answer": "cuchillo", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/cuchillo.jpg"},
            {"question": question, "answer": "tenedor", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/tenedor.jpg"},
            {"question": question, "answer": "zapatillas", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/zapatillas.jpg"},
            {"question": question, "answer": "television", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/television.jpg"},
            {"question": question, "answer": "pañuelos", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/pañuelos.jpg"},
            {"question": question, "answer": "peine", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/peine.jpg"},
            {"question": question, "answer": "reloj", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Objetos/reloj.jpg"}
        ],
        "dos": [
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""}
        ],
        "tres":[
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""},
            {"question": question, "answer":"", "image":""}
        ]
    };
    
    if(!sessionAttributes.counterOb){
        if(level == 1){
            objectsDeck = shuffle(objectsList.uno); 
        }
        if(level == 2){
            objectsDeck = shuffle(objectsList.dos);
        }
        if(level == 3){
            objectsDeck = shuffle(objectsList.tres);
        }
        console.log("objectsDeck: ", objectsDeck);
    	sessionAttributes.objectsDeck = objectsDeck;
    }
    else {
        objectsDeck = sessionAttributes.objectsDeck;
	    console.log("objectsDeck: ", objectsDeck);
    }
    const objects = objectsDeck[sessionAttributes.counterOb];
    
    sessionAttributes.lastObject = objects;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.log("objects: ", objects);
    return objects;
}

//Explicación: Permite obtener la siguiente pregunta en el ejercicio de los colores.
//Parámetros: La información de la petición.
//Devoluciones: Un array con la pregunta, la respuesta y la URL de la imagen.
function getNextColors(handlerInput){
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var colorsDeck = [];
    
    const colorsList = {
        "uno":[
            {"question": "¿De qué color es una lata de cocacola?", "answer": "rojo", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/cocacola_byn.jpg"},
            {"question": "¿De qué color es una mandarina?", "answer": "naranja", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/mandarina_byn.jpg"},
            {"question": "¿De qué color es una manzana?", "answer": "verde", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/manzana_byn.jpg"},
            {"question": "¿De qué color es una pera?", "answer": "verde", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/pera_byn.jpg"},
            {"question": "¿De qué color es un plátano?", "answer": "amarillo", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/platano_byn.jpg"},
            {"question": "¿De qué color es la harina?", "answer": "blanco", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/harina_byn.jpg"},
            {"question": "¿De qué color es la leche?", "answer": "blanco", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/leche_byn.jpg"},
            {"question": "¿De qué color es el cielo?", "answer": "azul", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/cielo_byn.jpg"},
            {"question": "¿De qué color es la hierba?", "answer": "verde", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/hierba_byn.jpg"},
            {"question": "¿De qué color es el contenedor de plásticos?", "answer": "amarillo", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/envases_byn.jpg"},
            {"question": "¿De qué color es el contenedor de papel y cartón?", "answer": "azul", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/carton_byn.jpg"},
            {"question": "¿De qué color es el tomate?", "answer": "rojo", "image": "https://tfg-alexa-images.s3.eu-west-3.amazonaws.com/Colores/tomate_byn.jpg"}
        ],
        "dos": [
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""}
        ],
        "tres":[
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""},
            {"question": "", "answer": "", "image": ""}
        ]
    };
    
    if(!sessionAttributes.counterCo){
        if(level == 1){
            colorsDeck = shuffle(colorsList.uno); 
        }
        if(level == 2){
            colorsDeck = shuffle(colorsList.dos);
        }
        if(level == 3){
            colorsDeck = shuffle(colorsList.tres);
        }
        console.log("colorsDeck: ", colorsDeck);
    	sessionAttributes.colorsDeck = colorsDeck;
    }
    else {
        colorsDeck = sessionAttributes.colorsDeck;
	    console.log("colorsDeck: ", colorsDeck);
    }
    const colors = colorsDeck[sessionAttributes.counterCo];
    
    sessionAttributes.lastColor = colors;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.log("colors: ", colors);
    return colors;
}

/*-------------------------------------------------------------------------------------*/
/*CHECKANSWER*/

//Explicación: Permite comprobar si la respuesta es correcta en el ejercicio del dinero.
//Parámetros: La información de la petición, la respuesta del usuario y una variable de control.
//Devoluciones: Un array con el estado de la respuesta (true si es correcto o false si es incorrecto), un string indicando la respuesta correcta si ha fallado y un audio.
function checkAnswerMo(handlerInput, answerSlot, checkanswer){
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log("answer: ", sessionAttributes.lastMoney.answer);
    
    if (sessionAttributes.lastMoney.answer.includes(answerSlot)){
		console.log("correcto");
		randomNum = numArray[sessionAttributes.counterMo];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Correcto/correctocopia-" + randomNum + ".mp3\"/>";
		message = "";
		sessionAttributes.correctMo++;
		status = true;
    }
    else {
		console.log("incorrecto");
		randomNum = numArray[sessionAttributes.counterMo];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Incorrecto/incorrectocopia-" + randomNum + ".mp3\"/>";
	    message = "La respuesta correcta era: " + sessionAttributes.lastMoney.answer + ". ";
	    sessionAttributes.wrongMo++;
		status = false;
    }
    
	sessionAttributes.counterMo += 1;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
	return {"status":status,"message":message,"audio":audio};
}

//Explicación: Permite comprobar si la respuesta es correcta en el ejercicio de las palabras.
//Parámetros: La información de la petición, la respuesta del usuario y una variable de control.
//Devoluciones: Un array con el estado de la respuesta (true si es correcto o false si es incorrecto), un string indicando la respuesta correcta si ha fallado y un audio.
function checkAnswerWo(handlerInput, answerSlot, checkanswer){
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log("answer: ", sessionAttributes.lastWord.answer);
    
    if (sessionAttributes.lastWord.answer.includes(answerSlot)){
    	console.log("correcto");
    	randomNum = numArray[sessionAttributes.counterWo];
    	audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Correcto/correctocopia-" + randomNum + ".mp3\"/>";
    	message = "";
    	sessionAttributes.correctWo++;
    	status = true;
	}
	else {
		console.log("incorrecto");
		randomNum = numArray[sessionAttributes.counterWo];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Incorrecto/incorrectocopia-" + randomNum + ".mp3\"/>";
	    message = "La respuesta correcta era: " + sessionAttributes.lastWord.answer + ". ";
	    sessionAttributes.wrongWo++;
		status = false;
	}

	sessionAttributes.counterWo += 1;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
	return {"status":status,"message":message,"audio":audio};
}

//Explicación: Permite comprobar si la respuesta es correcta en el ejercicio de las letras.
//Parámetros: La información de la petición, la respuesta del usuario y una variable de control.
//Devoluciones: Un array con el estado de la respuesta (true si es correcto o false si es incorrecto), un string indicando la respuesta correcta si ha fallado y un audio.
function checkAnswerLe(handlerInput, answerSlot, checkanswer){
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log("answer: ", sessionAttributes.lastLetters.answer);
    
    if (sessionAttributes.lastLetters.answer.includes(answerSlot)){
    	console.log("correcto");
    	randomNum = numArray[sessionAttributes.counterLe];
    	audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Correcto/correctocopia-" + randomNum + ".mp3\"/>";
    	message = "";
    	sessionAttributes.correctLe++;
    	status = true;
	}
	else {
		console.log("incorrecto");
		randomNum = numArray[sessionAttributes.counterLe];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Incorrecto/incorrectocopia-" + randomNum + ".mp3\"/>";
	    message = "La respuesta correcta era: " + sessionAttributes.lastLetters.answer + ". ";
	    sessionAttributes.wrongLe++;
		status = false;
	}

	sessionAttributes.counterLe += 1;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
	return {"status":status,"message":message,"audio":audio};
}

//Explicación: Permite comprobar si la respuesta es correcta en el ejercicio de los objetos.
//Parámetros: La información de la petición, la respuesta del usuario y una variable de control.
//Devoluciones: Un array con el estado de la respuesta (true si es correcto o false si es incorrecto), un string indicando la respuesta correcta si ha fallado y un audio.
function checkAnswerOb(handlerInput, answerSlot, checkanswer){
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log("answer: ", sessionAttributes.lastObject.answer);
    
    if (sessionAttributes.lastObject.answer.includes(answerSlot)){
    	console.log("correcto");
		randomNum = numArray[sessionAttributes.counterOb];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Correcto/correctocopia-" + randomNum + ".mp3\"/>";
		message = "";
		sessionAttributes.correctOb++;
		status = true;
	}
	else {
		console.log("incorrecto");
		randomNum = numArray[sessionAttributes.counterOb];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Incorrecto/incorrectocopia-" + randomNum + ".mp3\"/>";
	    message = "La respuesta correcta era: " + sessionAttributes.lastObject.answer + ". ";
	    sessionAttributes.wrongOb++;
		status = false;
	}

	sessionAttributes.counterOb += 1;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
	return {"status":status,"message":message,"audio":audio};
}

//Explicación: Permite comprobar si la respuesta es correcta en el ejercicio de los colores.
//Parámetros: La información de la petición, la respuesta del usuario y una variable de control.
//Devoluciones: Un array con el estado de la respuesta (true si es correcto o false si es incorrecto), un string indicando la respuesta correcta si ha fallado y un audio.
function checkAnswerCo(handlerInput, answerSlot, checkanswer){
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log("answer: ", sessionAttributes.lastColor.answer);
    
    if (sessionAttributes.lastColor.answer.includes(answerSlot)){
		console.log("correcto");
		randomNum = numArray[sessionAttributes.counterCo];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Correcto/correctocopia-" + randomNum + ".mp3\"/>";
		message = "";
		sessionAttributes.correctCo++;
		status = true;
	}
	else {
		console.log("incorrecto");
		randomNum = numArray[sessionAttributes.counterCo];
		audio = "<audio src=\"https://tfg-alexa-audios.s3.eu-west-3.amazonaws.com/Incorrecto/incorrectocopia-" + randomNum + ".mp3\"/>";
	    message = "La respuesta correcta era: " + sessionAttributes.lastColor.answer + ". ";
	    sessionAttributes.wrongCo++;
		status = false;
	}
    
	sessionAttributes.counterCo += 1;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
	return {"status":status,"message":message,"audio":audio};
}

//EXPORTS
//Este controlador actúa como el punto de entrada de la aplicación, enrutando todas las cargas útiles de solicitud y respuesta a los controladores anteriores. 
//Asegurarse de que todos los controladores o interceptores nuevos que haya definido se incluyan a continuación. 
//El orden importa: se procesan de arriba a abajo
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        WelcomeMoneyIntentHandler,
        AnswerMoneyIntentHandler,
        WelcomeWordsIntentHandler,
        AnswerWordsIntentHandler,
        WelcomeLettersIntentHandler,
        AnswerLettersIntentHandler,
        WelcomeObjectsIntentHandler,
        AnswerObjectsIntentHandler,
        WelcomeColorsIntentHandler,
        AnswerColorsIntentHandler,
        HelpIntentHandler,
        FallbackIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        interceptors.LocalizationRequestInterceptor,
        interceptors.LoggingRequestInterceptor,
        interceptors.LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        interceptors.LoggingResponseInterceptor,
        interceptors.SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(persistence.getPersistenceAdapter())
    .lambda();