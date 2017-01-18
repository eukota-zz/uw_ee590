#include "CL/cl.h"
#include "OCLArgs.h"
#include "tools.h"
#include "utils.h"
#include "homework1.h"
#include "arithmetic.h"
#include "enums.h"
#include <iostream>

#include <map>

using namespace std;
namespace
{
	int GLOBAL_ARRAY_WIDTH = 1024;
	int GLOBAL_ARRAY_HEIGHT = 1024;
	bool SKIP_VERIFICATION = false;
}

/////////// HOMEWORK 1

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


/////////// Input Gathering /////////////
int SetHwk1ValueM(ResultsStruct* results)
{
	GLOBAL_ARRAY_WIDTH = (int)tools::GetInput("Enter value for M:");
	return 0;
}
int SetHwk1ValueN(ResultsStruct* results)
{
	GLOBAL_ARRAY_HEIGHT = (int)tools::GetInput("Enter value for N:");
	return 0;
}
int SkipVerify(ResultsStruct* results)
{
	cout << "Enter 1 to Skip Verification in functions. Enter 0 to Do Verification: ";
	unsigned int i = (unsigned int)SKIP_VERIFICATION;
	cin >> i;
	SKIP_VERIFICATION = (i==1);
	return 0;
}
int RunCount(ResultsStruct* results)
{
	cout << "Enter number of runs to do: ";
	unsigned int i = dmath::RUN_COUNT;
	cin >> i;
	dmath::RUN_COUNT = i;
	return 0;
}


/////////// OpenCL ADD /////////// 
int exCL_add(ResultsStruct* results)
{
	//initialize Open CL objects (context, queue, etc.)
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	if (CL_SUCCESS != ocl.SetupOpenCL(deviceType))
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
	if (CL_SUCCESS != ocl.CreateAndBuildProgram("arithmetic.cl"))
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
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 2))
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

	_aligned_free(inputA);
	_aligned_free(inputB);
	_aligned_free(outputC);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcB))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

/////////// SEQUENTIAL ADD via C /////////// 
int exSequential_addC(ResultsStruct* results)
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
			const size_t row = i % arrayWidth;
			const size_t col = (i - row) / arrayWidth;
			if (matrixC[i] != matrixA[i] + matrixB[i])
			{
				LogError("Verification failed at (%d,%d): (%f + %f = %f)\n", row, col, matrixA[i], matrixB[i], matrixC[i]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");
	}

	// free memory
	free(matrixA);
	free(matrixB);
	free(matrixC);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

/////////// SEQUENTIAL ADD via C++ STL /////////// 
int exSequential_addSTL(ResultsStruct* results)
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
			const size_t row = i % arrayWidth;
			const size_t col = (i - row) / arrayWidth;
			if (matrixC[i] != matrixA[i] + matrixB[i])
			{
				LogError("Verification failed at (%d,%d): (%d + %d = %d)\n", row, col, matrixA[i], matrixB[i], matrixC[i]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");
	}

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

/////////// OpenCL SAXPY /////////// 
int exCL_SAXPY_1D(ResultsStruct* results)
{
	//initialize Open CL objects (context, queue, etc.)
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	if (CL_SUCCESS != ocl.SetupOpenCL(deviceType))
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
	if (CL_SUCCESS != ocl.CreateAndBuildProgram("arithmetic.cl"))
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
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1))
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

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

/////////// SEQUENTIAL SAXPY 1D via C /////////// 
int exSequential_SAXPY_1D_C(ResultsStruct* results)
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

	// free memory
	free(matrixA);
	free(matrixB);
	free(matrixC);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

/////////// SEQUENTIAL SAXPY 1D via C++ STL /////////// 
int exSequential_SAXPY_1D_STL(ResultsStruct* results)
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

	// no need to clear memory - C++ vectors will delete on going out of scope
	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

/////////// OpenCL SAXPY 2D /////////// 
int exCL_SAXPY_2D(ResultsStruct* results)
{
	//initialize Open CL objects (context, queue, etc.)
	cl_int err;
	ocl_args_d_t ocl;
	cl_device_type deviceType = CL_DEVICE_TYPE_GPU;
	if (CL_SUCCESS != ocl.SetupOpenCL(deviceType))
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
	if (CL_SUCCESS != ocl.CreateAndBuildProgram("arithmetic.cl"))
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
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 2))
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

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

/////////// SEQUENTIAL SAXPY 2D via C /////////// 
int exSequential_SAXPY_2D_C(ResultsStruct* results)
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

	free(matrixA);
	free(matrixB);
	free(matrixC);
	free(matrixD);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

/////////// SEQUENTIAL SAXPY 2D via C++ STL /////////// 
int exSequential_SAXPY_2D_STL(ResultsStruct* results)
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

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}