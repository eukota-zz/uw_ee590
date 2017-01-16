/*****************************************************************************
 * Copyright (c) 2013-2016 Intel Corporation
 * All rights reserved.
 *
 * WARRANTY DISCLAIMER
 *
 * THESE MATERIALS ARE PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL INTEL OR ITS
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THESE
 * MATERIALS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Intel Corporation is the author of the Materials, and requests that all
 * problem reports or change requests be submitted to it directly
 *****************************************************************************/

// @TODO move openCL kernel interface functions to separate file
// Retain only the _tmain() function and console interaction
// Consider writing a UI - ask Chris B for help?
// Provide repo to David Pinney

// @todo HWK 1 additions
// allow input:
//  1 - allow M and N size input designations on command
//  2 - allow number of iteration count 
// fix STL C++ to use 1D vector while calculating indices

#include <iostream>
#include <stdio.h>
#include <stdlib.h>
#include <tchar.h>
#include <memory.h>
#include <vector>
#include <map>
#include "ProblemGroups.h"
#include <string>

#include "CL\cl.h"
#include "utils.h"
#include "profiler.h"
#include "tools.h"
#include "arithmetic.h"

//for perf. counters
#include <Windows.h>

using namespace std;

namespace
{
int GLOBAL_ARRAY_WIDTH = 1024;
int GLOBAL_ARRAY_HEIGHT = 1024;
bool SKIP_VERIFICATION = false;
}

// Macros for OpenCL versions
#define OPENCL_VERSION_1_2  1.2f
#define OPENCL_VERSION_2_0  2.0f

/* This function helps to create informative messages in
 * case when OpenCL errors occur. It returns a string
 * representation for an OpenCL error code.
 * (E.g. "CL_DEVICE_NOT_FOUND" instead of just -1.)
 */
const char* TranslateOpenCLError(cl_int errorCode)
{
    switch(errorCode)
    {
    case CL_SUCCESS:                            return "CL_SUCCESS";
    case CL_DEVICE_NOT_FOUND:                   return "CL_DEVICE_NOT_FOUND";
    case CL_DEVICE_NOT_AVAILABLE:               return "CL_DEVICE_NOT_AVAILABLE";
    case CL_COMPILER_NOT_AVAILABLE:             return "CL_COMPILER_NOT_AVAILABLE";
    case CL_MEM_OBJECT_ALLOCATION_FAILURE:      return "CL_MEM_OBJECT_ALLOCATION_FAILURE";
    case CL_OUT_OF_RESOURCES:                   return "CL_OUT_OF_RESOURCES";
    case CL_OUT_OF_HOST_MEMORY:                 return "CL_OUT_OF_HOST_MEMORY";
    case CL_PROFILING_INFO_NOT_AVAILABLE:       return "CL_PROFILING_INFO_NOT_AVAILABLE";
    case CL_MEM_COPY_OVERLAP:                   return "CL_MEM_COPY_OVERLAP";
    case CL_IMAGE_FORMAT_MISMATCH:              return "CL_IMAGE_FORMAT_MISMATCH";
    case CL_IMAGE_FORMAT_NOT_SUPPORTED:         return "CL_IMAGE_FORMAT_NOT_SUPPORTED";
    case CL_BUILD_PROGRAM_FAILURE:              return "CL_BUILD_PROGRAM_FAILURE";
    case CL_MAP_FAILURE:                        return "CL_MAP_FAILURE";
    case CL_MISALIGNED_SUB_BUFFER_OFFSET:       return "CL_MISALIGNED_SUB_BUFFER_OFFSET";                          //-13
    case CL_EXEC_STATUS_ERROR_FOR_EVENTS_IN_WAIT_LIST:    return "CL_EXEC_STATUS_ERROR_FOR_EVENTS_IN_WAIT_LIST";   //-14
    case CL_COMPILE_PROGRAM_FAILURE:            return "CL_COMPILE_PROGRAM_FAILURE";                               //-15
    case CL_LINKER_NOT_AVAILABLE:               return "CL_LINKER_NOT_AVAILABLE";                                  //-16
    case CL_LINK_PROGRAM_FAILURE:               return "CL_LINK_PROGRAM_FAILURE";                                  //-17
    case CL_DEVICE_PARTITION_FAILED:            return "CL_DEVICE_PARTITION_FAILED";                               //-18
    case CL_KERNEL_ARG_INFO_NOT_AVAILABLE:      return "CL_KERNEL_ARG_INFO_NOT_AVAILABLE";                         //-19
    case CL_INVALID_VALUE:                      return "CL_INVALID_VALUE";
    case CL_INVALID_DEVICE_TYPE:                return "CL_INVALID_DEVICE_TYPE";
    case CL_INVALID_PLATFORM:                   return "CL_INVALID_PLATFORM";
    case CL_INVALID_DEVICE:                     return "CL_INVALID_DEVICE";
    case CL_INVALID_CONTEXT:                    return "CL_INVALID_CONTEXT";
    case CL_INVALID_QUEUE_PROPERTIES:           return "CL_INVALID_QUEUE_PROPERTIES";
    case CL_INVALID_COMMAND_QUEUE:              return "CL_INVALID_COMMAND_QUEUE";
    case CL_INVALID_HOST_PTR:                   return "CL_INVALID_HOST_PTR";
    case CL_INVALID_MEM_OBJECT:                 return "CL_INVALID_MEM_OBJECT";
    case CL_INVALID_IMAGE_FORMAT_DESCRIPTOR:    return "CL_INVALID_IMAGE_FORMAT_DESCRIPTOR";
    case CL_INVALID_IMAGE_SIZE:                 return "CL_INVALID_IMAGE_SIZE";
    case CL_INVALID_SAMPLER:                    return "CL_INVALID_SAMPLER";
    case CL_INVALID_BINARY:                     return "CL_INVALID_BINARY";
    case CL_INVALID_BUILD_OPTIONS:              return "CL_INVALID_BUILD_OPTIONS";
    case CL_INVALID_PROGRAM:                    return "CL_INVALID_PROGRAM";
    case CL_INVALID_PROGRAM_EXECUTABLE:         return "CL_INVALID_PROGRAM_EXECUTABLE";
    case CL_INVALID_KERNEL_NAME:                return "CL_INVALID_KERNEL_NAME";
    case CL_INVALID_KERNEL_DEFINITION:          return "CL_INVALID_KERNEL_DEFINITION";
    case CL_INVALID_KERNEL:                     return "CL_INVALID_KERNEL";
    case CL_INVALID_ARG_INDEX:                  return "CL_INVALID_ARG_INDEX";
    case CL_INVALID_ARG_VALUE:                  return "CL_INVALID_ARG_VALUE";
    case CL_INVALID_ARG_SIZE:                   return "CL_INVALID_ARG_SIZE";
    case CL_INVALID_KERNEL_ARGS:                return "CL_INVALID_KERNEL_ARGS";
    case CL_INVALID_WORK_DIMENSION:             return "CL_INVALID_WORK_DIMENSION";
    case CL_INVALID_WORK_GROUP_SIZE:            return "CL_INVALID_WORK_GROUP_SIZE";
    case CL_INVALID_WORK_ITEM_SIZE:             return "CL_INVALID_WORK_ITEM_SIZE";
    case CL_INVALID_GLOBAL_OFFSET:              return "CL_INVALID_GLOBAL_OFFSET";
    case CL_INVALID_EVENT_WAIT_LIST:            return "CL_INVALID_EVENT_WAIT_LIST";
    case CL_INVALID_EVENT:                      return "CL_INVALID_EVENT";
    case CL_INVALID_OPERATION:                  return "CL_INVALID_OPERATION";
    case CL_INVALID_GL_OBJECT:                  return "CL_INVALID_GL_OBJECT";
    case CL_INVALID_BUFFER_SIZE:                return "CL_INVALID_BUFFER_SIZE";
    case CL_INVALID_MIP_LEVEL:                  return "CL_INVALID_MIP_LEVEL";
    case CL_INVALID_GLOBAL_WORK_SIZE:           return "CL_INVALID_GLOBAL_WORK_SIZE";                           //-63
    case CL_INVALID_PROPERTY:                   return "CL_INVALID_PROPERTY";                                   //-64
    case CL_INVALID_IMAGE_DESCRIPTOR:           return "CL_INVALID_IMAGE_DESCRIPTOR";                           //-65
    case CL_INVALID_COMPILER_OPTIONS:           return "CL_INVALID_COMPILER_OPTIONS";                           //-66
    case CL_INVALID_LINKER_OPTIONS:             return "CL_INVALID_LINKER_OPTIONS";                             //-67
    case CL_INVALID_DEVICE_PARTITION_COUNT:     return "CL_INVALID_DEVICE_PARTITION_COUNT";                     //-68
//    case CL_INVALID_PIPE_SIZE:                  return "CL_INVALID_PIPE_SIZE";                                  //-69
//    case CL_INVALID_DEVICE_QUEUE:               return "CL_INVALID_DEVICE_QUEUE";                               //-70    

    default:
        return "UNKNOWN ERROR CODE";
    }
}


/* Convenient container for all OpenCL specific objects used in the sample
 *
 * It consists of two parts:
 *   - regular OpenCL objects which are used in almost each normal OpenCL applications
 *   - several OpenCL objects that are specific for this particular sample
 *
 * You collect all these objects in one structure for utility purposes
 * only, there is no OpenCL specific here: just to avoid global variables
 * and make passing all these arguments in functions easier.
 */
struct ocl_args_d_t
{
    ocl_args_d_t();
    ~ocl_args_d_t();

    // Regular OpenCL objects:
    cl_context       context;           // hold the context handler
    cl_device_id     device;            // hold the selected device handler
    cl_command_queue commandQueue;      // hold the commands-queue handler
    cl_program       program;           // hold the program handler
    cl_kernel        kernel;            // hold the kernel handler
    float            platformVersion;   // hold the OpenCL platform version (default 1.2)
    float            deviceVersion;     // hold the OpenCL device version (default. 1.2)
    float            compilerVersion;   // hold the device OpenCL C version (default. 1.2)
};

ocl_args_d_t::ocl_args_d_t():
        context(NULL),
        device(NULL),
        commandQueue(NULL),
        program(NULL),
        kernel(NULL),
        platformVersion(OPENCL_VERSION_1_2),
        deviceVersion(OPENCL_VERSION_1_2),
        compilerVersion(OPENCL_VERSION_1_2)
{
}

/*
 * destructor - called only once
 * Release all OpenCL objects
 * This is a regular sequence of calls to deallocate all created OpenCL resources in bootstrapOpenCL.
 *
 * You may want to call these deallocation procedures in the middle of your application execution
 * (not at the end) if you don't further need OpenCL runtime.
 * You may want to do that in order to free some memory, for example,
 * or recreate OpenCL objects with different parameters.
 *
 */
ocl_args_d_t::~ocl_args_d_t()
{
    cl_int err = CL_SUCCESS;

    if (kernel)
    {
        err = clReleaseKernel(kernel);
        if (CL_SUCCESS != err)
        {
            LogError("Error: clReleaseKernel returned '%s'.\n", TranslateOpenCLError(err));
        }
    }
    if (program)
    {
        err = clReleaseProgram(program);
        if (CL_SUCCESS != err)
        {
            LogError("Error: clReleaseProgram returned '%s'.\n", TranslateOpenCLError(err));
        }
    }
    if (commandQueue)
    {
        err = clReleaseCommandQueue(commandQueue);
        if (CL_SUCCESS != err)
        {
            LogError("Error: clReleaseCommandQueue returned '%s'.\n", TranslateOpenCLError(err));
        }
    }
    if (device)
    {
        err = clReleaseDevice(device);
        if (CL_SUCCESS != err)
        {
            LogError("Error: clReleaseDevice returned '%s'.\n", TranslateOpenCLError(err));
        }
    }
    if (context)
    {
        err = clReleaseContext(context);
        if (CL_SUCCESS != err)
        {
            LogError("Error: clReleaseContext returned '%s'.\n", TranslateOpenCLError(err));
        }
    }

    /*
     * Note there is no procedure to deallocate platform 
     * because it was not created at the startup,
     * but just queried from OpenCL runtime.
     */
}


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
    LogInfo("Number of available platforms: %u\n", numPlatforms);

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


/*
 * This function read the OpenCL platdorm and device versions
 * (using clGetxxxInfo API) and stores it in the ocl structure.
 * Later it will enable us to support both OpenCL 1.2 and 2.0 platforms and devices
 * in the same program.
 */
int GetPlatformAndDeviceVersion (cl_platform_id platformId, ocl_args_d_t *ocl)
{
    cl_int err = CL_SUCCESS;

    // Read the platform's version string length (param_value is NULL).
    // The value returned in stringLength
    size_t stringLength = 0;
    err = clGetPlatformInfo(platformId, CL_PLATFORM_VERSION, 0, NULL, &stringLength);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clGetPlatformInfo() to get CL_PLATFORM_VERSION length returned '%s'.\n", TranslateOpenCLError(err));
        return err;
    }

    // Now, that we know the platform's version string length, we can allocate enough space before read it
    std::vector<char> platformVersion(stringLength);

    // Read the platform's version string
    // The read value returned in platformVersion
    err = clGetPlatformInfo(platformId, CL_PLATFORM_VERSION, stringLength, &platformVersion[0], NULL);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clGetplatform_ids() to get CL_PLATFORM_VERSION returned %s.\n", TranslateOpenCLError(err));
        return err;
    }

    if (strstr(&platformVersion[0], "OpenCL 2.0") != NULL)
    {
        ocl->platformVersion = OPENCL_VERSION_2_0;
    }

    // Read the device's version string length (param_value is NULL).
    err = clGetDeviceInfo(ocl->device, CL_DEVICE_VERSION, 0, NULL, &stringLength);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clGetDeviceInfo() to get CL_DEVICE_VERSION length returned '%s'.\n", TranslateOpenCLError(err));
        return err;
    }

    // Now, that we know the device's version string length, we can allocate enough space before read it
    std::vector<char> deviceVersion(stringLength);

    // Read the device's version string
    // The read value returned in deviceVersion
    err = clGetDeviceInfo(ocl->device, CL_DEVICE_VERSION, stringLength, &deviceVersion[0], NULL);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clGetDeviceInfo() to get CL_DEVICE_VERSION returned %s.\n", TranslateOpenCLError(err));
        return err;
    }

    if (strstr(&deviceVersion[0], "OpenCL 2.0") != NULL)
    {
        ocl->deviceVersion = OPENCL_VERSION_2_0;
    }

    // Read the device's OpenCL C version string length (param_value is NULL).
    err = clGetDeviceInfo(ocl->device, CL_DEVICE_OPENCL_C_VERSION, 0, NULL, &stringLength);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clGetDeviceInfo() to get CL_DEVICE_OPENCL_C_VERSION length returned '%s'.\n", TranslateOpenCLError(err));
        return err;
    }

    // Now, that we know the device's OpenCL C version string length, we can allocate enough space before read it
    std::vector<char> compilerVersion(stringLength);

    // Read the device's OpenCL C version string
    // The read value returned in compilerVersion
    err = clGetDeviceInfo(ocl->device, CL_DEVICE_OPENCL_C_VERSION, stringLength, &compilerVersion[0], NULL);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clGetDeviceInfo() to get CL_DEVICE_OPENCL_C_VERSION returned %s.\n", TranslateOpenCLError(err));
        return err;
    }

    else if (strstr(&compilerVersion[0], "OpenCL C 2.0") != NULL)
    {
        ocl->compilerVersion = OPENCL_VERSION_2_0;
    }

    return err;
}



/*
 * This function picks/creates necessary OpenCL objects which are needed.
 * The objects are:
 * OpenCL platform, device, context, and command queue.
 *
 * All these steps are needed to be performed once in a regular OpenCL application.
 * This happens before actual compute kernels calls are performed.
 *
 * For convenience, in this application you store all those basic OpenCL objects in structure ocl_args_d_t,
 * so this function populates fields of this structure, which is passed as parameter ocl.
 * Please, consider reviewing the fields before going further.
 * The structure definition is right in the beginning of this file.
 *
 * Dependencies: None
 */
int SetupOpenCL(ocl_args_d_t *ocl, cl_device_type deviceType)
{
    // The following variable stores return codes for all OpenCL calls.
    cl_int err = CL_SUCCESS;

    // Query for all available OpenCL platforms on the system
    // Here you enumerate all platforms and pick one which name has preferredPlatform as a sub-string
    cl_platform_id platformId = FindOpenCLPlatform("Intel", deviceType);
    if (NULL == platformId)
    {
        LogError("Error: Failed to find OpenCL platform.\n");
        return CL_INVALID_VALUE;
    }

    // Create context with device of specified type.
    // Required device type is passed as function argument deviceType.
    // So you may use this function to create context for any CPU or GPU OpenCL device.
    // The creation is synchronized (pfn_notify is NULL) and NULL user_data
    cl_context_properties contextProperties[] = {CL_CONTEXT_PLATFORM, (cl_context_properties)platformId, 0};
    ocl->context = clCreateContextFromType(contextProperties, deviceType, NULL, NULL, &err);
    if ((CL_SUCCESS != err) || (NULL == ocl->context))
    {
        LogError("Couldn't create a context, clCreateContextFromType() returned '%s'.\n", TranslateOpenCLError(err));
        return err;
    }

    // Query for OpenCL device which was used for context creation
    err = clGetContextInfo(ocl->context, CL_CONTEXT_DEVICES, sizeof(cl_device_id), &ocl->device, NULL);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clGetContextInfo() to get list of devices returned %s.\n", TranslateOpenCLError(err));
        return err;
    }

    // Read the OpenCL platform's version and the device OpenCL and OpenCL C versions
    GetPlatformAndDeviceVersion(platformId, ocl);

    // Create command queue.
    // OpenCL kernels are enqueued for execution to a particular device through special objects called command queues.
    // Command queue guarantees some ordering between calls and other OpenCL commands.
    // Here you create a simple in-order OpenCL command queue that doesn't allow execution of two kernels in parallel on a target device.
#ifdef CL_VERSION_2_0
    if (OPENCL_VERSION_2_0 == ocl->deviceVersion)
    {
        const cl_command_queue_properties properties[] = {CL_QUEUE_PROPERTIES, 0, 0};
        ocl->commandQueue = clCreateCommandQueueWithProperties(ocl->context, ocl->device, properties, &err);
    } 
    else {
        // default behavior: OpenCL 1.2
        cl_command_queue_properties properties = 0;
        ocl->commandQueue = clCreateCommandQueue(ocl->context, ocl->device, properties, &err);
    } 
#else
    // default behavior: OpenCL 1.2
    cl_command_queue_properties properties = 0;
    ocl->commandQueue = clCreateCommandQueue(ocl->context, ocl->device, properties, &err);
#endif
    if (CL_SUCCESS != err)
    {
        LogError("Error: clCreateCommandQueue() returned %s.\n", TranslateOpenCLError(err));
        return err;
    }

    return CL_SUCCESS;
}


// Create and build OpenCL program from its source code
// @param[in] filename name of opencl kernel file to be read
int CreateAndBuildProgram(ocl_args_d_t *ocl, const std::string& filename)
{
    cl_int err = CL_SUCCESS;

    // Upload the OpenCL C source code from the input file to source
    // The size of the C program is returned in sourceSize
    char* source = NULL;
    size_t src_size = 0;
    err = ReadSourceFromFile(filename.c_str(), &source, &src_size);
    if (CL_SUCCESS != err)
    {
        LogError("Error: ReadSourceFromFile returned %s.\n", TranslateOpenCLError(err));
        goto Finish;
    }

    // And now after you obtained a regular C string call clCreateProgramWithSource to create OpenCL program object.
    ocl->program = clCreateProgramWithSource(ocl->context, 1, (const char**)&source, &src_size, &err);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clCreateProgramWithSource returned %s.\n", TranslateOpenCLError(err));
        goto Finish;
    }

    // Build the program
    // During creation a program is not built. You need to explicitly call build function.
    // Here you just use create-build sequence,
    // but there are also other possibilities when program consist of several parts,
    // some of which are libraries, and you may want to consider using clCompileProgram and clLinkProgram as
    // alternatives.
    err = clBuildProgram(ocl->program, 1, &ocl->device, "", NULL, NULL);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clBuildProgram() for source program returned %s.\n", TranslateOpenCLError(err));

        // In case of error print the build log to the standard output
        // First check the size of the log
        // Then allocate the memory and obtain the log from the program
        if (err == CL_BUILD_PROGRAM_FAILURE)
        {
            size_t log_size = 0;
            clGetProgramBuildInfo(ocl->program, ocl->device, CL_PROGRAM_BUILD_LOG, 0, NULL, &log_size);

            std::vector<char> build_log(log_size);
            clGetProgramBuildInfo(ocl->program, ocl->device, CL_PROGRAM_BUILD_LOG, log_size, &build_log[0], NULL);

            LogError("Error happened during the build of OpenCL program.\nBuild log:%s", &build_log[0]);
        }
    }

Finish:
    if (source)
    {
        delete[] source;
        source = NULL;
    }

	return err;
}


int CreateReadBufferArg_Float(cl_context *context, cl_mem* mem, cl_float* input)
{
	cl_int err = CL_SUCCESS;

	*mem = clCreateBuffer(*context, CL_MEM_READ_ONLY | CL_MEM_USE_HOST_PTR, sizeof(cl_float), input, &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateBuffer for Read returned %s\n", TranslateOpenCLError(err));
		return err;
	}
	return 0;
}

int CreateReadBufferArg_FloatArray(cl_context *context, cl_mem* mem, cl_float* input, cl_uint arrayWidth, cl_uint arrayHeight)
{
	cl_int err = CL_SUCCESS;

	*mem = clCreateBuffer(*context, CL_MEM_READ_ONLY | CL_MEM_USE_HOST_PTR, sizeof(cl_float)*arrayWidth*arrayHeight, input, &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateBuffer for Read returned %s\n", TranslateOpenCLError(err));
		return err;
	}
	return 0;
}

int CreateWriteBufferArg_FloatArray(cl_context *context, cl_mem* mem, cl_float* output, cl_uint arrayWidth, cl_uint arrayHeight)
{
	cl_int err = CL_SUCCESS;
	*mem = clCreateBuffer(*context, CL_MEM_WRITE_ONLY | CL_MEM_USE_HOST_PTR, sizeof(cl_float) * arrayWidth * arrayHeight, output, &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateBuffer for Write returned %s\n", TranslateOpenCLError(err));
		return err;
	}
	return 0;
}


cl_uint SetKernelArgument(cl_kernel* kernel, cl_mem* mem, unsigned int argNum)
{
	cl_int err = clSetKernelArg(*kernel, argNum, sizeof(cl_mem), (void *)mem);
	if (CL_SUCCESS != err)
		LogError("error: Failed to set argument %d, returned %s\n", argNum, TranslateOpenCLError(err));
	return err;
}

// Execute the Kernel
// @param[in] globalWorkSize size_t array of passed in constants to use
// @param[in] workSizeCount size of the globalWorkSize array
cl_uint ExecuteKernel(ocl_args_d_t *ocl, size_t *globalWorkSize, size_t workSizeCount)
{
    cl_int err = CL_SUCCESS;

	// execute kernel
    err = clEnqueueNDRangeKernel(ocl->commandQueue, ocl->kernel, workSizeCount, NULL, globalWorkSize, NULL, 0, NULL, NULL /* cl_even profileEvent */);
    if (CL_SUCCESS != err)
    {
        LogError("Error: Failed to run kernel, return %s\n", TranslateOpenCLError(err));
        return err;
    }

    // Wait until the queued kernel is completed by the device
    err = clFinish(ocl->commandQueue);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clFinish return %s\n", TranslateOpenCLError(err));
        return err;
    }

    return CL_SUCCESS;
}

// Forward declared for use by MapHostBufferToLocal()
cl_uint UnmapHostBufferFromLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_float* localMem);
// Map Host Memory to Local Memory
// BE SURE TO CALL ReleaseBuffer AFTER DONE USING!
// @param[in] hostMem cl_mem to map from
// @param[out] result local memory to map to
cl_uint MapHostBufferToLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_uint width, cl_uint height, cl_float** localMem)
{
	cl_int err = CL_SUCCESS;

	const bool blockingMap = true;
	*localMem = (cl_float *)clEnqueueMapBuffer(*commandQueue, *hostMem, blockingMap, CL_MAP_READ, 0 /*buffer offset*/, sizeof(cl_uint) * width * height, 0, NULL, NULL, &err);

	if (CL_SUCCESS != err)
	{
		LogError("Error: clEnqueueMapBuffer returned %s\n", TranslateOpenCLError(err));
		return err;
	}

	// Call clFinish to guarantee that output region is updated
	err = clFinish(*commandQueue);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clFinish returned %s\n", TranslateOpenCLError(err));
		UnmapHostBufferFromLocal(commandQueue, hostMem, *localMem); // attempt to unmap to clear 
	}
	return err;
}

// Unmap Host Memory from Local Memory
// TO BE CALLED AFTER MapBuffer()
cl_uint UnmapHostBufferFromLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_float* localMem)
{
	// Unmapped the output buffer before releasing it
	cl_int err = clEnqueueUnmapMemObject(*commandQueue, *hostMem, localMem, 0, NULL, NULL);
	if (CL_SUCCESS != err)
		LogError("Error: clEnqueueUnmapMemObject returned %s\n", TranslateOpenCLError(err));

	return err;
}

/////////// OpenCL ADD /////////// 
float exCL_add()
{
	//initialize Open CL objects (context, queue, etc.)
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	if (CL_SUCCESS != SetupOpenCL(&ocl, deviceType))
		return -1;

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint arrayHeight = GLOBAL_ARRAY_HEIGHT;
	cl_uint optimizedSize = ((sizeof(cl_float) * arrayWidth * arrayHeight - 1) / 64 + 1) * 64;
	cl_float* inputA = (cl_float*)_aligned_malloc(optimizedSize, 4096);
	cl_float* inputB = (cl_float*)_aligned_malloc(optimizedSize, 4096);
	cl_float* outputC = (cl_float*)_aligned_malloc(optimizedSize, 4096);
	if (NULL == inputA || NULL == inputB || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputCL(inputA, arrayWidth, arrayHeight);
	tools::generateInputCL(inputB, arrayWidth, arrayHeight);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           srcB;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcA, inputA, arrayWidth, arrayHeight))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcB, inputB, arrayWidth, arrayHeight))
		return -1;
	if (CL_SUCCESS != CreateWriteBufferArg_FloatArray(&ocl.context, &dstMem, outputC, arrayWidth, arrayHeight))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != CreateAndBuildProgram(&ocl, "arithmetic.cl")) 
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, "Add", &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcB, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 2))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[2] = { arrayWidth, arrayHeight };
	if (CL_SUCCESS != ExecuteKernel(&ocl, globalWorkSize, 2))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();
	
	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, arrayHeight, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		unsigned int size = arrayWidth * arrayHeight;
		bool failed = false;
		for (unsigned int k = 0; k < size; ++k)
		{
			if (resultPtr[k] != inputA[k] + inputB[k])
			{
				LogError("Verification failed at %d: (%f + %f = %f)\n", k, inputA[k], inputB[k], resultPtr[k]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}
	else
	{
		LogInfo("Verification skipped.\n");
	}

	_aligned_free(inputA);
	_aligned_free(inputB);
	_aligned_free(outputC);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcB))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	
	return runTime;
}

/////////// SEQUENTIAL ADD via C /////////// 
float exSequential_addC()
{
	const size_t arrayWidth = GLOBAL_ARRAY_WIDTH;
	const size_t arrayHeight = GLOBAL_ARRAY_HEIGHT;

	// allocate memory
	const size_t matrixSize = arrayWidth*arrayHeight;
	float* matrixA = (float*)malloc((sizeof(float) * matrixSize));
	float* matrixB = (float*)malloc((sizeof(float) * matrixSize));
	float* matrixC = (float*)malloc((sizeof(float) * matrixSize));

	// generate data
	tools::generateInputC(matrixA, arrayWidth, arrayHeight);
	tools::generateInputC(matrixB, arrayWidth, arrayHeight);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	dmath::add(matrixA, matrixB, matrixC, arrayWidth, arrayHeight);
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// verify
		bool failed = false;
		for (size_t i = 0; i < matrixSize; i++)
		{
			const int row = i % arrayWidth;
			const int col = (i - row) / arrayWidth;
			if (matrixC[i] != matrixA[i] + matrixB[i])
			{
				LogError("Verification failed at (%d,%d): (%f + %f = %f)\n", row, col, matrixA[i], matrixB[i], matrixC[i]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");
	}
	else
	{
		LogInfo("Verification skipped.\n");
	}

	// free memory
	free(matrixA);
	free(matrixB);
	free(matrixC);
	return runTime;
}

/////////// SEQUENTIAL ADD via C++ STL /////////// 
float exSequential_addSTL()
{
	const size_t arrayWidth = GLOBAL_ARRAY_WIDTH;
	const size_t arrayHeight = GLOBAL_ARRAY_HEIGHT;
	size_t matrixSize = arrayWidth*arrayHeight;
	std::vector<float> matrixA(matrixSize, 0.0);
	std::vector<float> matrixB(matrixSize, 0.0);
	std::vector<float> matrixC(matrixSize, 0.0);
	tools::generateInputSTL(&matrixA);
	tools::generateInputSTL(&matrixB);

	ProfilerStruct profiler;
	profiler.Start();
	dmath::add(matrixA, matrixB, &matrixC);
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Verify 
		bool failed = false;
		for (size_t i = 0; i < matrixSize; i++)
		{
			const int row = i % arrayWidth;
			const int col = (i - row) / arrayWidth;
			if (matrixC[i] != matrixA[i] + matrixB[i])
			{
				LogError("Verification failed at (%d,%d): (%d + %d = %d)\n", row, col, matrixA[i], matrixB[i], matrixC[i]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");
	}
	else
	{
		LogInfo("Verification skipped.\n");
	}

	return runTime;
}

/////////// OpenCL SAXPY /////////// 
float exCL_SAXPY_1D()
{
	//initialize Open CL objects (context, queue, etc.)
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	if (CL_SUCCESS != SetupOpenCL(&ocl, deviceType))
		return -1;

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = (cl_uint)GLOBAL_ARRAY_WIDTH;
	cl_float* inputA = (cl_float*)malloc(sizeof(cl_float));
	cl_float* inputX = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth), 4096);
	cl_float* inputY = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth), 4096);
	cl_float* outputZ = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth), 4096);
	if (NULL == inputA || NULL == inputX || NULL == inputY || NULL == outputZ)
	{
		LogError("Error: malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	*inputA = (cl_float)(rand() % 100);
	tools::generateInputCL(inputX, arrayWidth, 1);
	tools::generateInputCL(inputY, arrayWidth, 1);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           scalarA;
	cl_mem           srcX;              // hold first source buffer
	cl_mem           srcY;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg_Float(&ocl.context, &scalarA, inputA))						// A
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcX, inputX, arrayWidth, 1))		// X
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcY, inputY, arrayWidth, 1))		// Y
		return -1;
	if (CL_SUCCESS != CreateWriteBufferArg_FloatArray(&ocl.context, &dstMem, outputZ, arrayWidth, 1))	// output
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != CreateAndBuildProgram(&ocl, "arithmetic.cl"))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, "SAXPY_1D", &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &scalarA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcX, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcY, 2))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 3))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ExecuteKernel(&ocl, globalWorkSize, 1))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, 1, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		const size_t size = (size_t)arrayWidth;
		bool failed = false;
		for (size_t i = 0; i < size; ++i)
		{
			if (resultPtr[i] != inputA[0] * inputX[i] + inputY[i])
			{
				LogError("Verification failed at %d: (%f * %f + %f = %f)\n", i, inputA[0], inputX[i], inputY[i], resultPtr[i]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}
	else
	{
		LogInfo("Verification skipped.\n");
	}


	free(inputA);
	_aligned_free(inputX);
	_aligned_free(inputY);
	_aligned_free(outputZ);

	if (CL_SUCCESS != clReleaseMemObject(scalarA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcX))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcY))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	return runTime;
}

/////////// SEQUENTIAL SAXPY 1D via C /////////// 
float exSequential_SAXPY_1D_C()
{
	// allocate memory
	const size_t width = GLOBAL_ARRAY_WIDTH;
	float Aval = (float)(rand() % 100);
	float* matrixA = (float*)malloc((sizeof(float) * width));
	float* matrixB = (float*)malloc((sizeof(float) * width));
	float* matrixC = (float*)malloc((sizeof(float) * width));

	// generate data
	tools::generateInputC(matrixA, width, 1);
	tools::generateInputC(matrixB, width, 1);

	// Run
	ProfilerStruct profiler;
	profiler.Start();
	dmath::saxpy_1d(Aval, matrixA, matrixB, matrixC, width);
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Verify
		bool failed = false;
		for (size_t i = 0; i < width; i++)
		{
			if (matrixC[i] != Aval*matrixA[i] + matrixB[i])
			{
				LogError("Verification failed at %d: (%f*%f + %f = %f)\n", i, Aval, matrixA[i], matrixB[i], matrixC[i]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");
	}
	else
	{
		LogInfo("Verification skipped.\n");
	}

	// free memory
	free(matrixA);
	free(matrixB);
	free(matrixC);

	return runTime;
}

/////////// SEQUENTIAL SAXPY 1D via C++ STL /////////// 
float exSequential_SAXPY_1D_STL()
{
	const size_t width = GLOBAL_ARRAY_WIDTH;
	std::vector<float> matrixA(width, 0.0);
	std::vector<float> matrixB(width, 0.0);
	std::vector<float> matrixC(width, 0.0);
	
	// generate random data
	float Aval = (float)(rand() % 100);
	for (size_t i = 0; i < width; i++)
	{
		matrixA[i] = (float)(rand() % 100);
		matrixB[i] = (float)(rand() % 100);
	}

	// Run
	ProfilerStruct profiler;
	profiler.Start();
	dmath::saxpy_1d(Aval, matrixA, matrixB, &matrixC);
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// verify
		bool failed = false;
		for (size_t i = 0; i < width; i++)
		{
			if (matrixC[i] != Aval*matrixA[i] + matrixB[i])
			{
				LogError("Verification failed at (d: (%f*%f + %f = %f)\n", i, Aval, matrixA[i], matrixB[i], matrixC[i]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");
	}
	else
	{
		LogInfo("Verification skipped.\n");
	}

	// no need to clear memory - C++ vectors will delete on going out of scope
	return runTime;
}

/////////// OpenCL SAXPY 2D /////////// 
float exCL_SAXPY_2D()
{
	//initialize Open CL objects (context, queue, etc.)
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	if (CL_SUCCESS != SetupOpenCL(&ocl, deviceType))
		return -1;

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayValM = GLOBAL_ARRAY_WIDTH;
	cl_uint arrayValN = GLOBAL_ARRAY_HEIGHT;


#ifdef TEST_STATIC_VALUES
	arrayValM = 3;
	arrayValN = 2;
#endif
	cl_float* inputA = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayValM * arrayValM), 4096);
	cl_float* inputX = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayValM * arrayValN), 4096);
	cl_float* inputY = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayValM * arrayValN), 4096);
	cl_float* outputZ = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayValM * arrayValN), 4096);
	if (NULL == inputA || NULL == inputX || NULL == inputY || NULL == outputZ)
	{
		LogError("Error: malloc failed to allocate buffers.\n");
		return -1;
	}

// Use this if you get super-stuck and need to figure something out...
#ifdef TEST_STATIC_VALUES
	inputA[0] = 1;
	inputA[1] = 2;
	inputA[2] = 3;
	inputA[3] = 4;
	inputA[4] = 5;
	inputA[5] = 6;
	inputA[6] = 7;
	inputA[7] = 8;
	inputA[8] = 9;
	inputX[0] = 1;
	inputX[1] = 1;
	inputX[2] = 1;
	inputX[3] = 1;
	inputX[4] = 1;
	inputX[5] = 1;
	inputY[0] = 1;
	inputY[1] = 1;
	inputY[2] = 1;
	inputY[3] = 1;
	inputY[4] = 1;
	inputY[5] = 1;
#else
	// Generate Random Input
	tools::generateInputCL(inputA, arrayValM, arrayValM);
	tools::generateInputCL(inputX, arrayValM, arrayValN);
	tools::generateInputCL(inputY, arrayValM, arrayValN);
#endif

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;				// hold scalar buffer
	cl_mem           srcX;              // hold first source buffer
	cl_mem           srcY;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcA, inputA, arrayValM, arrayValM))		// A
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcX, inputX, arrayValM, arrayValN))		// X
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcY, inputY, arrayValM, arrayValN))		// Y
		return -1;
	if (CL_SUCCESS != CreateWriteBufferArg_FloatArray(&ocl.context, &dstMem, outputZ, arrayValM, arrayValN))	// output
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != CreateAndBuildProgram(&ocl, "arithmetic.cl"))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, "SAXPY_2D", &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcX, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcY, 2))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 3))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[2] = { arrayValM, arrayValN };
	if (CL_SUCCESS != ExecuteKernel(&ocl, globalWorkSize, 2))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayValM, arrayValN, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		const size_t a_width = arrayValM;
		const size_t xyz_width = arrayValN;
		bool failed = false;
		for (size_t row = 0; row < (size_t)arrayValM; row++)
		{
			for (size_t col = 0; col < (size_t)arrayValN; col++)
			{
				// Multiply the row of pA by the column of pX to get the row, column of product.  
				const size_t xyz_id = row*xyz_width + col;

				float singleEntry = inputY[xyz_id];
				for (size_t inner = 0; inner < a_width; inner++)
				{
					const size_t innerRowId = row*a_width + inner;
					const size_t innerColId = inner*xyz_width + col;
					singleEntry += inputA[innerRowId] * inputX[innerColId];
				}
				const size_t resultsId = row*(arrayValN)+col;
				if (singleEntry != resultPtr[resultsId])
				{
					LogError("Verification failed at %d: expected %f; actual %f\n", resultsId, singleEntry, resultPtr[resultsId]);
					failed = true;
				}
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}
	else
	{
		LogInfo("Verification skipped.\n");
	}

	_aligned_free(inputA);
	_aligned_free(inputX);
	_aligned_free(inputY);
	_aligned_free(outputZ);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcX))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcY))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	return runTime;
}

/////////// SEQUENTIAL SAXPY 2D via C /////////// 
float exSequential_SAXPY_2D_C()
{
	const size_t arrayValM = GLOBAL_ARRAY_WIDTH;
	const size_t arrayValN = GLOBAL_ARRAY_HEIGHT;
	float* matrixA = (float*)malloc((sizeof(float) * arrayValM * arrayValM));
	float* matrixB = (float*)malloc((sizeof(float) * arrayValM * arrayValN));
	float* matrixC = (float*)malloc((sizeof(float) * arrayValM * arrayValN));
	float* matrixD = (float*)malloc((sizeof(float) * arrayValM * arrayValN));

	// generate data
	tools::generateInputC(matrixA, arrayValM, arrayValM);
	tools::generateInputC(matrixB, arrayValM, arrayValN);
	tools::generateInputC(matrixC, arrayValM, arrayValN);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	dmath::saxpy_2d(matrixA, matrixB, matrixC, matrixD, arrayValM, arrayValN);
	profiler.Stop();
	float runTime = profiler.Log();

	LogInfo("Verification skipped.\n");

	free(matrixA);
	free(matrixB);
	free(matrixC);
	free(matrixD);

	return runTime;
}

/////////// SEQUENTIAL SAXPY 2D via C++ STL /////////// 
float exSequential_SAXPY_2D_STL()
{
	const size_t M = GLOBAL_ARRAY_WIDTH;
	const size_t N = GLOBAL_ARRAY_HEIGHT;
	std::vector<float> matrixA(M*M);
	std::vector<float> matrixB(M*N);
	std::vector<float> matrixC(M*N);
	std::vector<float> matrixD(M*N);

	// generate data
	tools::generateInputSTL(&matrixA);
	tools::generateInputSTL(&matrixB);
	tools::generateInputSTL(&matrixC);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	dmath::saxpy_2d(matrixA, matrixB, matrixC, M, N, &matrixD);
	profiler.Stop();
	float runTime = profiler.Log();

	LogInfo("Verification skipped.\n");

	return runTime;
}

/////////// Input Gathering /////////////
float GetInput(const std::string& prompt)
{
	std::cout << prompt;
	float v;
	std::cin >> v;
	return v;
}
float SetHwk1ValueM()
{
	GLOBAL_ARRAY_WIDTH = (int)GetInput("Enter value for M:");
	return 0;
}
float SetHwk1ValueN()
{
	GLOBAL_ARRAY_HEIGHT = (int)GetInput("Enter value for N:");
	return 0;
}
float SkipVerify()
{
	cout << "Enter 1 to Skip Verification in functions. Enter 0 to Do Verification: ";
	unsigned int i = (unsigned int)SKIP_VERIFICATION;
	cin >> i;
	SKIP_VERIFICATION = (bool)i;
	return 0;
}
float RunCount()
{
	cout << "Enter number of runs to do: ";
	unsigned int i = dmath::RUN_COUNT;
	cin >> i;
	dmath::RUN_COUNT = i;
	return 0;
}

//@TODO map hwk1 and hwk2 into single class group
/////////// HOMEWORK 1
class HWK1Class : public GroupManager
{
public:
	HWK1Class() : GroupManager("Homework 1")
	{
		groups_ = GroupFactory();
	}
	virtual std::string ProblemGroupName() { return "Homework 1"; }
	virtual std::string ProblemName() { return ""; }
	std::map<int, ProblemGroup*> GroupFactory();
};
std::map<int, ProblemGroup*> HWK1Class::GroupFactory()
{
	std::map<int, ProblemGroup*> pgs;
	ProblemGroup* InputControl = new ProblemGroup(0, "Input Control");
	InputControl->problems_[1] = new Problem(&SetHwk1ValueM, "Set M Value (defaults to 1024)");
	InputControl->problems_[2] = new Problem(&SetHwk1ValueN, "Set N Value (defaults to 1024)");
	InputControl->problems_[3] = new Problem(&SkipVerify, "Skip Verification (defaults to 0)");
	InputControl->problems_[4] = new Problem(&RunCount, "Set the number of runs (defaults to 1)");
	pgs[InputControl->GroupNum()] = InputControl;

	ProblemGroup* Homework1 = new ProblemGroup(1, "Homework 1");
	Homework1->problems_[1] = new Problem(&exCL_add, "Add Two Vectors: OpenCL");
	Homework1->problems_[2] = new Problem(&exSequential_addC, "Add Two Vectors: Sequentiall C");
	Homework1->problems_[3] = new Problem(&exSequential_addSTL, "Add Two Vectors: Sequential C++ STL");
	Homework1->problems_[4] = new Problem(&exCL_SAXPY_1D, "SAXPY 1D: OpenCL");
	Homework1->problems_[5] = new Problem(&exSequential_SAXPY_1D_C, "SAXPY 1D: Sequential C");
	Homework1->problems_[6] = new Problem(&exSequential_SAXPY_1D_STL, "SAXPY 1D: Sequential C++ STL");
	Homework1->problems_[7] = new Problem(&exCL_SAXPY_2D, "SAXPY 2D Kernel");
	Homework1->problems_[8] = new Problem(&exSequential_SAXPY_2D_C, "SAXPY 2D Sequentially using C");
	Homework1->problems_[9] = new Problem(&exSequential_SAXPY_2D_STL, "SAXPY 2D Sequentially using C++ STL");
	pgs[Homework1->GroupNum()] = Homework1;

	return pgs;
}

/////////// HOMEWORK 2
class HWK2Class : public GroupManager
{
public:
	HWK2Class() : GroupManager("Homework 2")
	{
		groups_ = GroupFactory2();
	}
	virtual std::string ProblemGroupName() { return "Homework 2"; }
	virtual std::string ProblemName() { return ""; }
	std::map<int, ProblemGroup*> GroupFactory2();
};
std::map<int, ProblemGroup*> HWK2Class::GroupFactory2()
{
	std::map<int, ProblemGroup*> pgs;
	ProblemGroup* Homework2 = new ProblemGroup(1, "Homework 2");
	pgs[Homework2->GroupNum()] = Homework2;
	return pgs;
}

void PrintInstructions()
{
	cout << endl << "MAIN MENU:" << endl
		<< "// 1 --> Homework 1 //" << endl
		<< "// 2 --> Homework 2 //" << endl
		<< "// Q --> Quit       //" << endl
		<< endl;
}

int _tmain(int argc, TCHAR* argv[])
{
	srand(12345);
	bool runTests = false;
	string input;
	do
	{
		int res = 0;
		PrintInstructions();
		cin >> input;
		if (input == "1")
		{
			HWK1Class hwk1c;
			res = hwk1c.Run();
		}
		if (input == "2")
		{
			HWK2Class hwk2c;
			res = hwk2c.Run();
		}
		if (input == "Q" || input == "q")
		{
			break;
		}
		cout << "Results (0 = success): " << res << endl;
	} while (true);

	return 0;
}


