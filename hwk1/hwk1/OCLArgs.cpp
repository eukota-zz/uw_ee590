#include "OCLArgs.h"
#include "CL/cl.h"
#include "utils.h"
#include "enums.h"
#include <vector>
#include <iostream>
#include <algorithm>
#include "ProblemGroups.h"

// Macros for OpenCL versions
#define OPENCL_VERSION_1_2  1.2f
#define OPENCL_VERSION_2_0  2.0f

ocl_args_d_t::ocl_args_d_t()
	: context(NULL)
	, device(NULL)
	, commandQueue(NULL)
	, program(NULL)
	, kernel(NULL)
	, platformVersion(OPENCL_VERSION_2_0)
	, deviceVersion(OPENCL_VERSION_2_0)
	, compilerVersion(OPENCL_VERSION_2_0)
	, prof_event(NULL)
	, run_time(0l)
{

}

ocl_args_d_t::ocl_args_d_t(cl_device_type deviceType)
	: context(NULL)
	, device(NULL)
	, commandQueue(NULL)
	, program(NULL)
	, kernel(NULL)
	, platformVersion(OPENCL_VERSION_2_0)
	, deviceVersion(OPENCL_VERSION_2_0)
	, compilerVersion(OPENCL_VERSION_2_0)
	, prof_event(NULL)
	, run_time(0l)
{
	SetupOpenCL(deviceType);
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
	if (prof_event)
	{
		err = clReleaseEvent(prof_event);
		if (CL_SUCCESS != err)
		{
			LogError("Error: clReleaseEvent returned '%s'.\n", TranslateOpenCLError(err));
		}
	}
	/*
	* Note there is no procedure to deallocate platform
	* because it was not created at the startup,
	* but just queried from OpenCL runtime.
	*/
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
int ocl_args_d_t::SetupOpenCL(cl_device_type deviceType)
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
	cl_context_properties contextProperties[] = { CL_CONTEXT_PLATFORM, (cl_context_properties)platformId, 0 };
	this->context = clCreateContextFromType(contextProperties, deviceType, NULL, NULL, &err);
	if ((CL_SUCCESS != err) || (NULL == this->context))
	{
		LogError("Couldn't create a context, clCreateContextFromType() returned '%s'.\n", TranslateOpenCLError(err));
		return err;
	}

	// Query for OpenCL device which was used for context creation
	err = clGetContextInfo(this->context, CL_CONTEXT_DEVICES, sizeof(cl_device_id), &this->device, NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetContextInfo() to get list of devices returned %s.\n", TranslateOpenCLError(err));
		return err;
	}

	// Read the OpenCL platform's version and the device OpenCL and OpenCL C versions
	GetPlatformAndDeviceVersion(platformId);

	// Create command queue.
	// OpenCL kernels are enqueued for execution to a particular device through special objects called command queues.
	// Command queue guarantees some ordering between calls and other OpenCL commands.
	// Here you create a simple in-order OpenCL command queue that doesn't allow execution of two kernels in parallel on a target device.
#ifdef CL_VERSION_2_0
	if (OPENCL_VERSION_2_0 == this->deviceVersion)
	{
		const cl_command_queue_properties properties[] = { CL_QUEUE_PROPERTIES, CL_QUEUE_PROFILING_ENABLE, 0 };
		this->commandQueue = clCreateCommandQueueWithProperties(this->context, this->device, properties, &err);
	}
	else
	{
		// default behavior: OpenCL 1.2
		cl_command_queue_properties properties = 0;
#pragma warning(suppress : 4996) // this is only used if OpenCL 1.2 is used in which case we still want the deprecated behavior
		this->commandQueue = clCreateCommandQueue(this->context, this->device, properties, &err);
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

	// Get Max Compute
	size_t maxSizeSize;
	err = clGetDeviceInfo(device, CL_DEVICE_MAX_WORK_GROUP_SIZE, NULL, NULL, &maxSizeSize);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetDeviceInfo() returned %s.\n", TranslateOpenCLError(err));
		return err;
	}
	err = clGetDeviceInfo(device, CL_DEVICE_MAX_WORK_GROUP_SIZE, maxSizeSize, &max_work_group_size, NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetDeviceInfo() returned %s.\n", TranslateOpenCLError(err));
		return err;
	}

	return CL_SUCCESS;
}


// Create and build OpenCL program from its source code
// @param[in] filename name of opencl kernel file to be read
int ocl_args_d_t::CreateAndBuildProgram(const std::string& filename)
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
	this->program = clCreateProgramWithSource(this->context, 1, (const char**)&source, &src_size, &err);
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
	err = clBuildProgram(this->program, 1, &this->device, "", NULL, NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clBuildProgram() for source program returned %s.\n", TranslateOpenCLError(err));

		// In case of error print the build log to the standard output
		// First check the size of the log
		// Then allocate the memory and obtain the log from the program
		if (err == CL_BUILD_PROGRAM_FAILURE)
		{
			size_t log_size = 0;
			clGetProgramBuildInfo(this->program, this->device, CL_PROGRAM_BUILD_LOG, 0, NULL, &log_size);

			std::vector<char> build_log(log_size);
			clGetProgramBuildInfo(this->program, this->device, CL_PROGRAM_BUILD_LOG, log_size, &build_log[0], NULL);

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

/*
* This function read the OpenCL platdorm and device versions
* (using clGetxxxInfo API) and stores it in the ocl structure.
* Later it will enable us to support both OpenCL 1.2 and 2.0 platforms and devices
* in the same program.
*/
int ocl_args_d_t::GetPlatformAndDeviceVersion(cl_platform_id platformId)
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
		this->platformVersion = OPENCL_VERSION_2_0;
	}

	// Read the device's version string length (param_value is NULL).
	err = clGetDeviceInfo(this->device, CL_DEVICE_VERSION, 0, NULL, &stringLength);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetDeviceInfo() to get CL_DEVICE_VERSION length returned '%s'.\n", TranslateOpenCLError(err));
		return err;
	}

	// Now, that we know the device's version string length, we can allocate enough space before read it
	std::vector<char> deviceVersion(stringLength);

	// Read the device's version string
	// The read value returned in deviceVersion
	err = clGetDeviceInfo(this->device, CL_DEVICE_VERSION, stringLength, &deviceVersion[0], NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetDeviceInfo() to get CL_DEVICE_VERSION returned %s.\n", TranslateOpenCLError(err));
		return err;
	}

	if (strstr(&deviceVersion[0], "OpenCL 2.0") != NULL)
	{
		this->deviceVersion = OPENCL_VERSION_2_0;
	}

	// Read the device's OpenCL C version string length (param_value is NULL).
	err = clGetDeviceInfo(this->device, CL_DEVICE_OPENCL_C_VERSION, 0, NULL, &stringLength);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetDeviceInfo() to get CL_DEVICE_OPENCL_C_VERSION length returned '%s'.\n", TranslateOpenCLError(err));
		return err;
	}

	// Now, that we know the device's OpenCL C version string length, we can allocate enough space before read it
	std::vector<char> compilerVersion(stringLength);

	// Read the device's OpenCL C version string
	// The read value returned in compilerVersion
	err = clGetDeviceInfo(this->device, CL_DEVICE_OPENCL_C_VERSION, stringLength, &compilerVersion[0], NULL);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetDeviceInfo() to get CL_DEVICE_OPENCL_C_VERSION returned %s.\n", TranslateOpenCLError(err));
		return err;
	}

	else if (strstr(&compilerVersion[0], "OpenCL C 2.0") != NULL)
	{
		this->compilerVersion = OPENCL_VERSION_2_0;
	}

	return err;
}

// Execute the Kernel
// @param[in] globalWorkSize size_t array of passed in constants to use
// @param[in] workSizeCount size of the globalWorkSize array
cl_uint ocl_args_d_t::helper_ExecuteKernel(size_t *globalWorkSize, cl_uint workSizeCount, size_t* localWorkSize)
{	
	cl_int err = CL_SUCCESS;
	
	// execute kernel
	err = clEnqueueNDRangeKernel(this->commandQueue, this->kernel, workSizeCount, 0, globalWorkSize, localWorkSize, 0, NULL, &prof_event);
	if (CL_SUCCESS != err)
	{
		LogError("Error: Failed to run kernel, return %s\n", TranslateOpenCLError(err));
		return err;
	}

	// Wait until the queued kernel is completed by the device
	err = clFinish(this->commandQueue);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clFinish return %s\n", TranslateOpenCLError(err));
		return err;
	}

	// Update internal OpenCL Profiler
	err = UpdateProfiler();
	if (CL_SUCCESS != err)
	{
		LogError("Error: clWaitForEvents return %s\n", TranslateOpenCLError(err));
		return err;
	}
	return CL_SUCCESS;
}

// @param[in] localWorkSize MUST be a 1 by (eg: {0})
cl_uint ocl_args_d_t::ExecuteKernel(size_t *globalWorkSize, cl_uint workSizeCount, size_t* localWorkSize)
{
	cl_int err = CL_SUCCESS;
	
	// no workgroup size determination
	if (!FIND_OPTIMAL_LOCAL_WORKGROUP_SIZE || localWorkSize)
	{
		err = helper_ExecuteKernel(globalWorkSize, workSizeCount, localWorkSize);
		if (CL_SUCCESS != err)
			LogError("Error: Failed to run kernel, return %s\n", TranslateOpenCLError(err));
		return err;
	}

	// Test out all WorkGroupSizes
	ResultsList resultsList;
	const size_t iMin = 1;
	const size_t iMax = max_work_group_size;
	const size_t jMin = (workSizeCount == 1 ? 0 : 1);
	const size_t jMax = (workSizeCount == 1 ? 0 : max_work_group_size);
	const size_t kMin = (workSizeCount < 3 ? 0 : 1);
	const size_t kMax = (workSizeCount < 3 ? 0 : max_work_group_size);
	for (size_t i = iMin; i <= iMax; i=i*2)
	{		
		for (size_t j = jMin; j <= jMax; j=j*2)
		{			
			for (size_t k = kMin; k <= kMax; k=k*2)
			{
				if (i > max_work_group_size || i*j > max_work_group_size || i*j*k > max_work_group_size)
				{
					if (k == 0)
						k++;
					continue;
				}
				size_t workSize[3] = { i, j, k };
				ResultsStruct* result = new ResultsStruct();
				err = helper_ExecuteKernel(globalWorkSize, workSizeCount, workSize);
				if (CL_SUCCESS != err)
				{
					LogError("Error: Failed to run kernel, return %s: (%d,%d,%d)\n", TranslateOpenCLError(err), workSize[0], workSize[1], workSize[2]);
				}
				else
				{
					result->Annotation = "Finding Optimal Local Work Item Size";
					result->OpenCLRunTime = RunTimeMS();
					result->HasOpenCLRunTime = true;
					result->WorkGroupSize[0] = i;
					result->WorkGroupSize[1] = j;
					result->WorkGroupSize[2] = k;
					resultsList.push_back(result);
				}
				if (k == 0)
					k++;
			}
			if (j == 0)
				j++;
		}
	}
	const std::string oldFile = RESULTS_FILE;
	RESULTS_FILE = "best_time.txt";
	PrintWorkGroupResultsToFile(resultsList);
	RESULTS_FILE = oldFile;

	return CL_SUCCESS;
}


cl_uint ocl_args_d_t::UpdateProfiler()
{
	cl_int err = clWaitForEvents(1, &prof_event);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clWaitForEvents return %s\n", TranslateOpenCLError(err));
		return err;
	}

	cl_ulong start_time, end_time;
	size_t return_bytes;
	err = clGetEventProfilingInfo(prof_event, CL_PROFILING_COMMAND_QUEUED, sizeof(cl_ulong), &start_time, &return_bytes);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetEventProfilingInfo for CL_PROFILING_COMMAND_QUEUED return %s\n", TranslateOpenCLError(err));
		return err;
	}

	err = clGetEventProfilingInfo(prof_event, CL_PROFILING_COMMAND_END, sizeof(cl_ulong), &end_time, &return_bytes);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clGetEventProfilingInfo for CL_PROFILING_COMMAND_QUEUED return %s\n", TranslateOpenCLError(err));
		return err;
	}
	run_time = end_time - start_time;
	return CL_SUCCESS;
}

cl_uint SetKernelArgument(cl_kernel* kernel, cl_uint* mem, unsigned int argNum)
{
	cl_int err = clSetKernelArg(*kernel, argNum, sizeof(cl_uint), (void *)mem);
	if (CL_SUCCESS != err)
		LogError("error: Failed to set argument %d, returned %s\n", argNum, TranslateOpenCLError(err));
	return err;
}

cl_uint SetKernelArgument(cl_kernel* kernel, cl_mem* mem, unsigned int argNum)
{
	cl_int err = clSetKernelArg(*kernel, argNum, sizeof(cl_mem), (void *)mem);
	if (CL_SUCCESS != err)
		LogError("error: Failed to set argument %d, returned %s\n", argNum, TranslateOpenCLError(err));
	return err;
}

// CREATE READ BUFFER ARGUMENT
int CreateReadBufferArg(cl_context *context, cl_mem* mem, cl_float* input, cl_uint arrayWidth, cl_uint arrayHeight)
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

int CreateReadBufferArg(cl_context *context, cl_mem* mem, cl_float4* input, cl_uint arrayWidth, cl_uint arrayHeight)
{
	cl_int err = CL_SUCCESS;

	*mem = clCreateBuffer(*context, CL_MEM_READ_ONLY | CL_MEM_USE_HOST_PTR, sizeof(cl_float4)*arrayWidth*arrayHeight, input, &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateBuffer for Read returned %s\n", TranslateOpenCLError(err));
		return err;
	}
	return 0;
}

int CreateReadBufferArg(cl_context *context, cl_mem* mem, cl_float16* input, cl_uint arrayWidth, cl_uint arrayHeight)
{
	cl_int err = CL_SUCCESS;

	*mem = clCreateBuffer(*context, CL_MEM_READ_ONLY | CL_MEM_USE_HOST_PTR, sizeof(cl_float16)*arrayWidth*arrayHeight, input, &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateBuffer for Read returned %s\n", TranslateOpenCLError(err));
		return err;
	}
	return 0;
}

// CREATE WRITE BUFFER ARGUMENT
int CreateWriteBufferArg(cl_context *context, cl_mem* mem, cl_float* output, cl_uint arrayWidth, cl_uint arrayHeight)
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

int CreateWriteBufferArg(cl_context *context, cl_mem* mem, cl_float4* output, cl_uint arrayWidth, cl_uint arrayHeight)
{
	cl_int err = CL_SUCCESS;
	*mem = clCreateBuffer(*context, CL_MEM_WRITE_ONLY | CL_MEM_USE_HOST_PTR, sizeof(cl_float4) * arrayWidth * arrayHeight, output, &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateBuffer for Write returned %s\n", TranslateOpenCLError(err));
		return err;
	}
	return 0;
}

int CreateWriteBufferArg(cl_context *context, cl_mem* mem, cl_float16* output, cl_uint arrayWidth, cl_uint arrayHeight)
{
	cl_int err = CL_SUCCESS;
	*mem = clCreateBuffer(*context, CL_MEM_WRITE_ONLY | CL_MEM_USE_HOST_PTR, sizeof(cl_float16) * arrayWidth * arrayHeight, output, &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateBuffer for Write returned %s\n", TranslateOpenCLError(err));
		return err;
	}
	return 0;
}

// Map Host Memory to Local Memory
// BE SURE TO CALL ReleaseBuffer AFTER DONE USING!
// @param[in] hostMem cl_mem to map from
// @param[out] result local memory to map to
cl_uint MapHostBufferToLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_uint width, cl_uint height, cl_float** localMem)
{
	cl_int err = CL_SUCCESS;

	const bool blockingMap = true;
	*localMem = (cl_float *)clEnqueueMapBuffer(*commandQueue, *hostMem, blockingMap, CL_MAP_READ, 0 /*buffer offset*/, sizeof(cl_float) * width * height, 0, NULL, NULL, &err);

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

cl_uint MapHostBufferToLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_uint width, cl_uint height, cl_float4** localMem)
{
	cl_int err = CL_SUCCESS;

	const bool blockingMap = true;
	*localMem = (cl_float4 *)clEnqueueMapBuffer(*commandQueue, *hostMem, blockingMap, CL_MAP_READ, 0 /*buffer offset*/, sizeof(cl_float4) * width * height, 0, NULL, NULL, &err);

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

cl_uint MapHostBufferToLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_uint width, cl_uint height, cl_float16** localMem)
{
	cl_int err = CL_SUCCESS;

	const bool blockingMap = true;
	*localMem = (cl_float16 *)clEnqueueMapBuffer(*commandQueue, *hostMem, blockingMap, CL_MAP_READ, 0 /*buffer offset*/, sizeof(cl_float16) * width * height, 0, NULL, NULL, &err);

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

cl_uint UnmapHostBufferFromLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_float4* localMem)
{
	// Unmapped the output buffer before releasing it
	cl_int err = clEnqueueUnmapMemObject(*commandQueue, *hostMem, localMem, 0, NULL, NULL);
	if (CL_SUCCESS != err)
		LogError("Error: clEnqueueUnmapMemObject returned %s\n", TranslateOpenCLError(err));

	return err;
}

cl_uint UnmapHostBufferFromLocal(cl_command_queue* commandQueue, cl_mem* hostMem, cl_float16* localMem)
{
	// Unmapped the output buffer before releasing it
	cl_int err = clEnqueueUnmapMemObject(*commandQueue, *hostMem, localMem, 0, NULL, NULL);
	if (CL_SUCCESS != err)
		LogError("Error: clEnqueueUnmapMemObject returned %s\n", TranslateOpenCLError(err));

	return err;
}
