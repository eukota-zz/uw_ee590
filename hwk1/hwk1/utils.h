
#include "CL\cl.h"
#include <d3d9.h>


#pragma once

// Print useful information to the default output. Same usage as with printf
void LogInfo(const char* str, ...);

// Print error notification to the default output. Same usage as with printf
void LogError(const char* str, ...);

// Read OpenCL source code from fileName and store it in source. The number of read bytes returns in sourceSize
int ReadSourceFromFile(const char* fileName, char** source, size_t* sourceSize);

cl_platform_id FindOpenCLPlatform(const char* preferredPlatform, cl_device_type deviceType);