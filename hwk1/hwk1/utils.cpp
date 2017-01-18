#include <stdio.h>
#include <stdlib.h>
#include <tchar.h>
#include <memory.h>
#include <windows.h>
#include <vector>
#include "CL\cl.h"
#include "CL\cl_ext.h"
#include "utils.h"
#include "enums.h"
#include <assert.h>

//we want to use POSIX functions
#pragma warning( push )
#pragma warning( disable : 4996 )
void LogInfo(const char* str, ...)
{
    if (str)
    {
        va_list args;
        va_start(args, str);

        vfprintf(stdout, str, args);

        va_end(args);
    }
}
void LogError(const char* str, ...)
{
    if (str)
    {
        va_list args;
        va_start(args, str);

        vfprintf(stderr, str, args);

        va_end(args);
    }
}
// Upload the OpenCL C source code to output argument source
// The memory resource is implicitly allocated in the function
// and should be deallocated by the caller
int ReadSourceFromFile(const char* fileName, char** source, size_t* sourceSize)
{
    int errorCode = CL_SUCCESS;

    FILE* fp = NULL;
    fopen_s(&fp, fileName, "rb");
    if (fp == NULL)
    {
        LogError("Error: Couldn't find program source file '%s'.\n", fileName);
        errorCode = CL_INVALID_VALUE;
    }
    else {
        fseek(fp, 0, SEEK_END);
        *sourceSize = ftell(fp);
        fseek(fp, 0, SEEK_SET);

        *source = new char[*sourceSize];
        if (*source == NULL)
        {
            LogError("Error: Couldn't allocate %d bytes for program source from file '%s'.\n", *sourceSize, fileName);
            errorCode = CL_OUT_OF_HOST_MEMORY;
        }
        else {
            fread(*source, 1, *sourceSize, fp);
        }
    }
    return errorCode;
}
#pragma warning( pop )


/*
* Check whether an OpenCL platform is the required platform
* (based on the platform's name)
*/
bool CheckPreferredPlatformMatch(cl_platform_id platform, const char* preferredPlatform)
{
	size_t stringLength = 0;
	cl_int err = CL_SUCCESS;
	bool match = false;

	// In order to read the platform's name, we first read the platform's name string length (param_value is NULL).
	// The value returned in stringLength
	err = clGetPlatformInfo(platform, CL_PLATFORM_NAME, 0, NULL, &stringLength);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetPlatformInfo() to get CL_PLATFORM_NAME length returned '%s'.\n", TranslateOpenCLError(err));
		return false;
	}

	// Now, that we know the platform's name string length, we can allocate enough space before read it
	std::vector<char> platformName(stringLength);

	// Read the platform's name string
	// The read value returned in platformName
	err = clGetPlatformInfo(platform, CL_PLATFORM_NAME, stringLength, &platformName[0], NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetplatform_ids() to get CL_PLATFORM_NAME returned %s.\n", TranslateOpenCLError(err));
		return false;
	}

	// Now check if the platform's name is the required one
	if (strstr(&platformName[0], preferredPlatform) != 0)
	{
		// The checked platform is the one we're looking for
		match = true;
	}

	return match;
}

/*
* Find and return the preferred OpenCL platform
* In case that preferredPlatform is NULL, the ID of the first discovered platform will be returned
*/
cl_platform_id FindOpenCLPlatform(const char* preferredPlatform, cl_device_type deviceType)
{
	cl_uint numPlatforms = 0;
	cl_int err = CL_SUCCESS;

	// Get (in numPlatforms) the number of OpenCL platforms available
	// No platform ID will be return, since platforms is NULL
	err = clGetPlatformIDs(0, NULL, &numPlatforms);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetplatform_ids() to get num platforms returned %s.\n", TranslateOpenCLError(err));
		return NULL;
	}
	
	if (0 == numPlatforms)
	{
		LogError("Error: No platforms found!\n");
		return NULL;
	}

	std::vector<cl_platform_id> platforms(numPlatforms);

	// Now, obtains a list of numPlatforms OpenCL platforms available
	// The list of platforms available will be returned in platforms
	err = clGetPlatformIDs(numPlatforms, &platforms[0], NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetplatform_ids() to get platforms returned %s.\n", TranslateOpenCLError(err));
		return NULL;
	}

	// Check if one of the available platform matches the preferred requirements
	for (cl_uint i = 0; i < numPlatforms; i++)
	{
		bool match = true;
		cl_uint numDevices = 0;

		// If the preferredPlatform is not NULL then check if platforms[i] is the required one
		// Otherwise, continue the check with platforms[i]
		if ((NULL != preferredPlatform) && (strlen(preferredPlatform) > 0))
		{
			// In case we're looking for a specific platform
			match = CheckPreferredPlatformMatch(platforms[i], preferredPlatform);
		}

		// match is true if the platform's name is the required one or don't care (NULL)
		if (match)
		{
			// Obtains the number of deviceType devices available on platform
			// When the function failed we expect numDevices to be zero.
			// We ignore the function return value since a non-zero error code
			// could happen if this platform doesn't support the specified device type.
			err = clGetDeviceIDs(platforms[i], deviceType, 0, NULL, &numDevices);
			if (CL_SUCCESS != err)
			{
				LogError("clGetDeviceIDs() returned %s.\n", TranslateOpenCLError(err));
			}

			if (0 != numDevices)
			{
				// There is at list one device that answer the requirements
				return platforms[i];
			}
		}
	}

	return NULL;
}


