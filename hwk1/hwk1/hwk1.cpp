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
// Retain only the _tmain() function and console interation
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
int GLOBAL_M = 1024;
int GLOBAL_N = 1024;
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


/* 
 * Create and build OpenCL program from its source code
 *
 * Dependencies: Imports .cl file by name
 */
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

/*
 * Execute the kernel
 */
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

/*
 * "Read" the result buffer (mapping the buffer to the host memory address)
 */
bool ReadAndVerifyAdd(cl_command_queue* commandQueue, cl_mem* outputC, cl_uint width, cl_uint height, cl_float *inputA, cl_float *inputB)
{
    cl_int err = CL_SUCCESS;
    bool result = true;

    // Enqueue a command to map the buffer object (ocl->dstMem) into the host address space and returns a pointer to it
    // The map operation is blocking
    cl_float *resultPtr = (cl_float *)clEnqueueMapBuffer(*commandQueue, *outputC, true, CL_MAP_READ, 0, sizeof(cl_uint) * width * height, 0, NULL, NULL, &err);

    if (CL_SUCCESS != err)
    {
        LogError("Error: clEnqueueMapBuffer returned %s\n", TranslateOpenCLError(err));
        return false;
    }

    // Call clFinish to guarantee that output region is updated
    err = clFinish(*commandQueue);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clFinish returned %s\n", TranslateOpenCLError(err));
    }

    // We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
    // Verify the results
    unsigned int size = width * height;
    for (unsigned int k = 0; k < size; ++k)
    {
        if (resultPtr[k] != inputA[k] + inputB[k])
        {
            LogError("Verification failed at %d: (%f + %f = %f)\n", k, inputA[k], inputB[k], resultPtr[k]);
            result = false;
        }
    }

     // Unmapped the output buffer before releasing it
    err = clEnqueueUnmapMemObject(*commandQueue, *outputC, resultPtr, 0, NULL, NULL);
    if (CL_SUCCESS != err)
    {
        LogError("Error: clEnqueueUnmapMemObject returned %s\n", TranslateOpenCLError(err));
    }

    return result;
}

bool ReadAndVerifySAXPY_1D(cl_command_queue* commandQueue, cl_mem* outputC, cl_uint width, cl_float inputA, cl_float *inputX, cl_float *inputY)
{
	cl_int err = CL_SUCCESS;
	bool result = true;

	// Enqueue a command to map the buffer object (ocl->dstMem) into the host address space and returns a pointer to it
	// The map operation is blocking
	cl_float *resultPtr = (cl_float *)clEnqueueMapBuffer(*commandQueue, *outputC, true, CL_MAP_READ, 0, sizeof(cl_uint) * width, 0, NULL, NULL, &err);

	if (CL_SUCCESS != err)
	{
		LogError("Error: clEnqueueMapBuffer returned %s\n", TranslateOpenCLError(err));
		return false;
	}

	// Call clFinish to guarantee that output region is updated
	err = clFinish(*commandQueue);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clFinish returned %s\n", TranslateOpenCLError(err));
	}

	// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
	// Verify the results
	unsigned int size = width;
	for (unsigned int k = 0; k < size; ++k)
	{
		if (resultPtr[k] != inputA*inputX[k] + inputY[k])
		{
			LogError("Verification failed at %d: (%f * %f + %f = %f)\n", k, inputA, inputX[k], inputY[k], resultPtr[k]);
			result = false;
		}
	}

	// Unmapped the output buffer before releasing it
	err = clEnqueueUnmapMemObject(*commandQueue, *outputC, resultPtr, 0, NULL, NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clEnqueueUnmapMemObject returned %s\n", TranslateOpenCLError(err));
	}

	return result;
}


/////////// OpenCL ADD /////////// 
int exCL_add()
{
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	cl_mem           srcA;              // hold first source buffer
	cl_mem           srcB;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer

	cl_uint arrayWidth = 1024;
	cl_uint arrayHeight = 1024;

	//initialize Open CL objects (context, queue, etc.)
	if (CL_SUCCESS != SetupOpenCL(&ocl, deviceType))
		return -1;

	// allocate working buffers. 
	// the buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint optimizedSize = ((sizeof(cl_float) * arrayWidth * arrayHeight - 1) / 64 + 1) * 64;
	cl_float* inputA = (cl_float*)_aligned_malloc(optimizedSize, 4096);
	cl_float* inputB = (cl_float*)_aligned_malloc(optimizedSize, 4096);
	cl_float* outputC = (cl_float*)_aligned_malloc(optimizedSize, 4096);
	if (NULL == inputA || NULL == inputB || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}

	//random input
	tools::generateInputCL(inputA, arrayWidth, arrayHeight);
	tools::generateInputCL(inputB, arrayWidth, arrayHeight);

	// Create OpenCL buffers from host memory
	// These buffers will be used later by the OpenCL kernel
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcA, inputA, arrayWidth, arrayHeight))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcB, inputB, arrayWidth, arrayHeight))
		return -1;
	if (CL_SUCCESS != CreateWriteBufferArg_FloatArray(&ocl.context, &dstMem, outputC, arrayWidth, arrayHeight))
		return -1;

	// Create and build the OpenCL program
	// Imports the named cl file
	if (CL_SUCCESS != CreateAndBuildProgram(&ocl, "arithmetic.cl")) 
		return -1;

	// Program consists of kernels.
	// Each kernel can be called (enqueued) from the host part of OpenCL application.
	// To call the kernel, you need to create it from existing program.
	// Kernel named here ("Add" in this case) must exist in the previously loaded cl file
	ocl.kernel = clCreateKernel(ocl.program, "Add", &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Passing arguments into OpenCL kernel.	
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcB, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 2))
		return -1;

	// FINALLY! RUN!
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[2] = { arrayWidth, arrayHeight };
	if (CL_SUCCESS != ExecuteKernel(&ocl, globalWorkSize, 2))
		return -1;
	profiler.Stop();
	profiler.Log();

	// The last part of this function: getting processed results back.
	// use map-unmap sequence to update original memory area with output buffer.
	if (ReadAndVerifyAdd(&ocl.commandQueue, &dstMem, arrayWidth, arrayHeight, inputA, inputB))
		LogInfo("Verified OpenCL Add Worked.\n");


	_aligned_free(inputA);
	_aligned_free(inputB);
	_aligned_free(outputC);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcB))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	
	return 0;
}

/////////// SEQUENTIAL ADD via C++ STL /////////// 
int exSequential_addSTL()
{
	const size_t arrayWidth = 1024;
	const size_t arrayHeight = 1024;
	std::vector<std::vector<float> > matrixA;
	std::vector<std::vector<float> > matrixB;
	std::vector<std::vector<float> > matrixC;
	tools::createEmptyMatrix(&matrixA, arrayWidth, arrayHeight);
	tools::createEmptyMatrix(&matrixB, arrayWidth, arrayHeight);
	tools::createEmptyMatrix(&matrixC, arrayWidth, arrayHeight);
	tools::generateInputSTL(&matrixA);
	tools::generateInputSTL(&matrixB);

	ProfilerStruct profiler;
	profiler.Start();
	dmath::add(matrixA, matrixB, &matrixC);
	profiler.Stop();
	profiler.Log();

	// verify 
	for (size_t row = 0; row < arrayHeight; row++)
	{
		for (size_t col = 0; col < arrayWidth; col++)
		{
			if (matrixC[row][col] != matrixA[row][col] + matrixB[row][col])
				LogError("Verification failed at (%d,%d): (%d + %d = %d)\n", row, col, matrixA[row][col], matrixB[row][col], matrixC[row][col]);
		}
	}


	return 0;
}

/////////// SEQUENTIAL ADD via C /////////// 
int exSequential_addC()
{
	const size_t arrayWidth = 1024;
	const size_t arrayHeight = 1024;
	
	// allocate memory
	float* matrixA = (float*)malloc((sizeof(float) * arrayWidth * arrayHeight));
	float* matrixB = (float*)malloc((sizeof(float) * arrayWidth * arrayHeight));
	float* matrixC = (float*)malloc((sizeof(float) * arrayWidth * arrayHeight));

	// generate data
	tools::generateInputC(matrixA, arrayWidth, arrayHeight);
	tools::generateInputC(matrixB, arrayWidth, arrayHeight);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	dmath::add(matrixA, matrixB, matrixC, arrayWidth, arrayHeight);
	profiler.Stop();
	profiler.Log();

	// free memory
	free(matrixA);
	free(matrixB);
	free(matrixC);
	return 0;
}

/////////// OpenCL SAXPY /////////// 
int exCL_SAXPY_1D()
{
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	cl_mem           scalarA;
	cl_mem           srcX;              // hold first source buffer
	cl_mem           srcY;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer

	if (CL_SUCCESS != SetupOpenCL(&ocl, deviceType))
		return -1;

	// allocate working buffers. 
	// the buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = 1024;
	cl_float* inputA = (cl_float*)malloc(sizeof(cl_float));
	cl_float* inputX = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth), 4096);
	cl_float* inputY = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth), 4096);
	cl_float* outputZ = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth), 4096);
	if (NULL == inputA || NULL == inputX || NULL == inputY || NULL == outputZ)
	{
		LogError("Error: malloc failed to allocate buffers.\n");
		return -1;
	}

	//random input
	*inputA = (cl_float)(rand() % 1000);
	tools::generateInputCL(inputX, arrayWidth, 1);
	tools::generateInputCL(inputY, arrayWidth, 1);

	// Create OpenCL buffers from host memory
	// These buffers will be used later by the OpenCL kernel
	if (CL_SUCCESS != CreateReadBufferArg_Float(&ocl.context, &scalarA, inputA))						// A
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcX, inputX, arrayWidth, 1))		// X
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcY, inputY, arrayWidth, 1))		// Y
		return -1;
	if (CL_SUCCESS != CreateWriteBufferArg_FloatArray(&ocl.context, &dstMem, outputZ, arrayWidth, 1))	// output
		return -1;

	// Create and build the OpenCL program
	if (CL_SUCCESS != CreateAndBuildProgram(&ocl, "arithmetic.cl"))
		return -1;
	ocl.kernel = clCreateKernel(ocl.program, "SAXPY_1D", &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Passing arguments into OpenCL kernel.
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &scalarA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcX, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcY, 2))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 3))
		return -1;

	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ExecuteKernel(&ocl, globalWorkSize, 1))
		return -1;
	profiler.Stop();
	profiler.Log();
	ReadAndVerifySAXPY_1D(&ocl.commandQueue, &dstMem, arrayWidth, *inputA, inputX, inputY);

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

	return 0;
}

/////////// SEQUENTIAL SAXPY 1D via C++ STL /////////// 
int exSequential_SAXPY_1D_STL()
{
	const size_t width = 1024;
	std::vector<float> matrixA(width);
	std::vector<float> matrixB(width);
	std::vector<float> matrixC(width);
	
	// generate random data
	srand(12345);
	float Aval = (float)(rand() % 1000);
	for (size_t i = 0; i < width; i++)
	{
		matrixA[i] = (float)(rand() % 1000);
		matrixB[i] = (float)(rand() % 1000);
	}

	// Run
	ProfilerStruct profiler;
	profiler.Start();
	dmath::saxpy_1d(Aval, matrixA, matrixB, &matrixC);
	profiler.Stop();
	profiler.Log();

	return 0;
}

/////////// OpenCL SAXPY /////////// 
int exCL_SAXPY_2D()
{
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	cl_mem           srcA;				// hold scalar buffer
	cl_mem           srcX;              // hold first source buffer
	cl_mem           srcY;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer

	if (CL_SUCCESS != SetupOpenCL(&ocl, deviceType))
		return -1;

	// allocate working buffers. 
	// the buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = 1024;
	cl_uint arrayHeight = 1024;
	cl_float* inputA = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth * arrayHeight), 4096);
	cl_float* inputX = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth * arrayHeight), 4096);
	cl_float* inputY = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth * arrayHeight), 4096);
	cl_float* outputZ = (cl_float*)_aligned_malloc((sizeof(cl_float) * arrayWidth * arrayHeight), 4096);
	if (NULL == inputA || NULL == inputX || NULL == inputY || NULL == outputZ)
	{
		LogError("Error: malloc failed to allocate buffers.\n");
		return -1;
	}

	//random input
	tools::generateInputCL(inputA, arrayWidth, arrayHeight);
	tools::generateInputCL(inputX, arrayWidth, arrayHeight);
	tools::generateInputCL(inputY, arrayWidth, arrayHeight);

	// Create OpenCL buffers from host memory
	// These buffers will be used later by the OpenCL kernel
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcA, inputA, arrayWidth, arrayHeight))		// A
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcX, inputX, arrayWidth, arrayHeight))		// X
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg_FloatArray(&ocl.context, &srcY, inputY, arrayWidth, arrayHeight))		// Y
		return -1;
	if (CL_SUCCESS != CreateWriteBufferArg_FloatArray(&ocl.context, &dstMem, outputZ, arrayWidth, arrayHeight))	// output
		return -1;

	// Create and build the OpenCL program
	if (CL_SUCCESS != CreateAndBuildProgram(&ocl, "arithmetic.cl"))
		return -1;
	ocl.kernel = clCreateKernel(ocl.program, "SAXPY_2D", &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Passing arguments into OpenCL kernel.
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcX, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcY, 2))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 3))
		return -1;

	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[2] = { arrayWidth, arrayHeight };
	if (CL_SUCCESS != ExecuteKernel(&ocl, globalWorkSize, 2))
		return -1;
	profiler.Stop();
	profiler.Log();
	//ReadAndVerifySAXPY_2D(&ocl.commandQueue, &dstMem, arrayWidth, *inputA, inputX, inputY);

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

	return 0;
}

/////////// SEQUENTIAL SAXPY 2D via C++ STL /////////// 
int exSequential_SAXPY_2D_STL()
{
	const size_t arrayWidth = 1024;
	const size_t arrayHeight = 1024;
	std::vector<std::vector<float> > matrixA;
	std::vector<std::vector<float> > matrixB;
	std::vector<std::vector<float> > matrixC;
	std::vector<std::vector<float> > matrixD;
	
	// allocate space
	tools::createEmptyMatrix(&matrixA, arrayWidth, arrayHeight);
	tools::createEmptyMatrix(&matrixB, arrayWidth, arrayHeight);
	tools::createEmptyMatrix(&matrixC, arrayWidth, arrayHeight);
	tools::createEmptyMatrix(&matrixD, arrayWidth, arrayHeight);

	// generate data
	tools::generateInputSTL(&matrixA);
	tools::generateInputSTL(&matrixB);
	tools::generateInputSTL(&matrixC);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	dmath::saxpy_2d(matrixA, matrixB, matrixC, &matrixD);
	profiler.Stop();
	profiler.Log();

	return 0;
}

/////////// SEQUENTIAL SAXPY 2D via C /////////// 
int exSequential_SAXPY_2D_C()
{
	const size_t arrayWidth = 1024;
	const size_t arrayHeight = 1024;
	float* matrixA = (float*)malloc((sizeof(float) * arrayWidth * arrayHeight));
	float* matrixB = (float*)malloc((sizeof(float) * arrayWidth * arrayHeight));
	float* matrixC = (float*)malloc((sizeof(float) * arrayWidth * arrayHeight));
	float* matrixD = (float*)malloc((sizeof(float) * arrayWidth * arrayHeight));
	
	// generate data
	tools::generateInputC(matrixA, arrayWidth, arrayHeight);
	tools::generateInputC(matrixB, arrayWidth, arrayHeight);
	tools::generateInputC(matrixC, arrayWidth, arrayHeight);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	dmath::saxpy_2d(matrixA, matrixB, matrixC, matrixD, arrayWidth, arrayHeight);
	profiler.Stop();
	profiler.Log();

	free(matrixA);
	free(matrixB);
	free(matrixC);
	free(matrixD);

	return 0;
}

int GetInput(const std::string& prompt)
{
	std::cout << prompt;
	int v;
	std::cin >> v;
	return v;
}

int SetHwk1ValueM()
{
	GLOBAL_M = GetInput("Enter value for M:");
	return 0;
}

int SetHwk1ValueN()
{
	GLOBAL_N = GetInput("Enter value for N:");
	return 0;
}


class HWK1Class : public GroupManager
{
public:
	HWK1Class() : GroupManager("Homework 1")
	{
		groups_ = GroupFactory();
	}
	virtual std::string ProblemGroupName() { return "Homework 1"; }
	virtual std::string ProblemName() { return "Test"; }
	std::map<int, ProblemGroup*> GroupFactory();
};

// FUNCTION AND INPUT FACTORY
std::map<int, ProblemGroup*> HWK1Class::GroupFactory()
{
	std::map<int, ProblemGroup*> pgs;
	ProblemGroup* InputControl = new ProblemGroup(0, "Input Control");
	InputControl->problems_[1] = new Problem(&SetHwk1ValueM, "Set M Value");
	InputControl->problems_[2] = new Problem(&SetHwk1ValueN, "Set N Value");
	pgs[InputControl->GroupNum()] = InputControl;

	ProblemGroup* Homework1 = new ProblemGroup(1, "Homework 1");
	Homework1->problems_[1] = new Problem(&exCL_add, "Add Two Vectors Kernel");
	Homework1->problems_[2] = new Problem(&exSequential_addSTL, "Add Two Vectors Sequentially using C++ STL");
	Homework1->problems_[3] = new Problem(&exSequential_addC, "Add Two Vectors Sequentially using C");
	Homework1->problems_[4] = new Problem(&exCL_SAXPY_1D, "SAXPY 1D Kernel");
	Homework1->problems_[5] = new Problem(&exSequential_SAXPY_1D_STL, "SAXPY 1D Sequentially using C++ STL");
	Homework1->problems_[6] = new Problem(&exCL_SAXPY_2D, "SAXPY 2D Kernel");
	Homework1->problems_[7] = new Problem(&exSequential_SAXPY_2D_STL, "SAXPY 2D Sequentially using C++ STL");
	Homework1->problems_[8] = new Problem(&exSequential_SAXPY_2D_C, "SAXPY 2D Sequentially using C");
	pgs[Homework1->GroupNum()] = Homework1;

	ProblemGroup* Homework2 = new ProblemGroup(2, "Homework 2");
	pgs[Homework2->GroupNum()] = Homework2;
	return pgs;
}



void PrintInstructions()
{
	cout << endl << "MAIN MENU:" << endl
		<< "// 1 --> Homework 1 //" << endl
		<< "// Q --> Quit       //" << endl
		<< endl;
}
int _tmain(int argc, TCHAR* argv[])
{
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
		if (input == "Q" || input == "q")
		{
			break;
		}
		cout << "Results (0 = success): " << res << endl;
	} while (true);

	return 0;
}


