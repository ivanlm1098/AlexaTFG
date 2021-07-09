module.exports = {
    //Explicación: Permite almacenar atributos de forma permanente utilizando para ello una base de datos
    //Devoluciones: Si se trata de una skill alojada en Alexa se utiliza S3 como base de datos. En caso contrario se utiliza DynamoDB
    //Esta skill está alojada en Alexa por lo que se utiliza S3
    getPersistenceAdapter() {
        //Explicación: Forma indirecta de detectar si se trata de una skill alojada en Alexa (Alexa-Hosted skill)
        //Devoluciones: true si es Alexa-Hosted skill o false en caso contrario
        function isAlexaHosted() {
            return process.env.S3_PERSISTENCE_BUCKET ? true : false;
        }
        const tableName = 'mental_exercises_table';
        if(isAlexaHosted()) {
            const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
            return new S3PersistenceAdapter({ 
                bucketName: process.env.S3_PERSISTENCE_BUCKET
            });
        } else {
            // IMPORTANTE: dar acceso a DynamoDB a la skill
            const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
            return new DynamoDbPersistenceAdapter({ 
                tableName: tableName,
                createTable: true
            });
        }
    }
}