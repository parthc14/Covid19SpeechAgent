# Natural User Interaction

## COVID-19 Assignment (Based on Dialogflow and Unity )

### Name: Parth Paresh Chitroda

### Level: Graduate

### Program Description

The program is a speech-interface that provides updated information about the COVID-19 virus.
The project is built on the Google Dialogflow platform which is used for natural language and intent recognition.
The front-end portion of the project is based on the Unity game engine with character taken from Mixamo.
It returns COVID-19 data specific to Countries, States, and Counties (excluding Cities). It can also return data within a specific time period. It can respond to commands like _What are the latest stats for Alachua County_, _How many new cases last week in the US?_, etc.

### Tools Used To Develop

1. Google Dialogflow
2. Unity Game Engine (LTS version 2018.4.21f1)
3. Operating System: Backend - Linux, Frontend (Unity) - Windows
4. Code Editor: Microsoft Visual Studio Code

### Dependencies

1. Backend - Dialogflow
   - Bent
2. Frontend - Unity
   - Mixamo (for Character)

### How to Compile

Double click the unityNUI.exe file in unityNui/Build directory. Press the record button to search a query adn stop after recording the query. In order to execute Query like "How many case in US since _last_ Monday" please make sure to include _last_ before a day as the Recognizer does not recognize the day.

### Folder Info

1. Backend-code is in index.js file
2. DialogFlow Intents and Agents includes the intents and agent required to restore to a google account
