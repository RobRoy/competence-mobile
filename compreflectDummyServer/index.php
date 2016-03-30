<?php

/**
 * This is a dummy server providing basic backend functionality for the mobile competence
 * app. It provides dummy API endpoints and JSON schemas for productivity implementation.
 * 
 * It utilizes https://schematic-ipsum.herokuapp.com/ to generate fake data based on the 
 * JSON schemas provided. Please ensure it has access to https://schematic-ipsum.herokuapp.com/
 *
 * To generate "sensible" data, I included annotations specific to https://schematic-ipsum.herokuapp.com/
 * in the JSON schemas. All the "ipsum" fields in the properties can be ignored when building
 * the API endpoints.
 *
 * @author Robert Schmidl
 * @version 0.9
 */

/**
 * Enable some headers to satisfy dev functionality
 */

// enable cors requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");
header('Content-Type: application/json');

// don't crash if the request was not sent correctly
if (isset($_GET['path'])) {
  $route = $_GET['path'];
}
else {
  $route = "";
}

/**
 * incredibly naive routing via switch block
 */

// routing
switch ($route) {
  case 'lms/user/exists':
    echo json_encode(getFakeData("login.json"));
    break;
  case 'lms/courses/moodle':
    echo json_encode(getFakeData("courselist.json"));
    break;
  case 'competences/coursecontext':
    echo json_encode(getFakeData("competences_for_course.json"));
    break;
  case 'competence':
    echo json_encode(getFakeData("competence.json"));
    break;
  case 'competence/user':
    echo json_encode(getFakeData("competence_user.json"));
    break;
  case 'competence/suggestions':
    echo json_encode(getFakeData("competence_suggestions.json"));
    break;
  case 'competences/user':
    echo json_encode(getFakeData("competences_for_user.json"));
    break;
  default:
    echo json_encode(getFakeData("nothing.json"));
    break;
}

/**
 * get fake data for the schemas
 */
function getFakeData($json_schema)
{
  return shell_exec('curl -vX POST http://schematic-ipsum.herokuapp.com/ -d @jsonschemas/'.$json_schema.' --header "Content-Type: application/json"'); 
}

?>